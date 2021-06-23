import { Component, Element, Event, EventEmitter, Prop, State, h } from '@stencil/core';
import { get, size, debounce, sample } from 'lodash';
import { IconLookup } from '@fortawesome/fontawesome-common-types';
import { setupCdnSvg, setupCdnWebfont, setupKit } from '../../utils/utils'

// TODO: figure out whether the IconPrefix type in @fortawesome/fontawesome-common-types
// should have 'fat' in it.
// But this also needs to include "fak" for icon uploads. Does that even belong in the IconPrefix type?
export type IconPrefix = "fas" | "fab" | "far" | "fal" | "fat" | "fad" | "fak";

const STYLE_RESULT_TO_PREFIX = {
  solid: 'fas',
  duotone: 'fad',
  regular: 'far',
  light: 'fal',
  thin: 'fat',
  kit: 'fak',
  brands: 'fab'
}

export interface IconChooserResult extends IconLookup {
  class?: string;
  style?: string;
}

export type QueryHandler = (document: string) => Promise<any>;

export type IconUpload = {
  name: string;
  unicode: number;
  version: number;
  width: string;
  height: string;
  path: string;
};

export type StyleFilters = {
  [prefix in IconPrefix]: boolean;
}

type KitMetadata = {
  version: string;
  technologySelected: string;
  licenseSelected: string;
  name: string;
  iconUploads: Array<IconUpload> | null;
};

@Component({
  tag: 'fa-icon-chooser',
  styleUrl: 'fa-icon-chooser.css',
  shadow: true,
})
export class FaIconChooser {

  /**
   * The host element for this component's Shadow DOM.
   */
  @Element() host: HTMLElement;

  /**
   * Font Awesome version in which to find icons.
   */
  @Prop() version?: string;

  /**
   * A kit token identifying a kit in which to find icons. Takes precedence over
   * the version prop if provided: the version associated with the kit will be used
   * for searching.
   */
  @Prop() kitToken?: string;

  /**
   * Whether pro icons should be enabled.
   */
  @Prop() pro: boolean;

  /**
   * A URL for loading Font Awesome within the icon chooser from the Font Awesome
   * Free or Pro CDN, instead of a kit.
   *
   * If a kitToken is provided, kit loading will be preferred over this.
   */
  @Prop() cdnUrl?: string;

  @Prop() handleQuery: QueryHandler;

  @Event({
    eventName: 'finish',
    composed: true,
    cancelable: true,
    bubbles: true,
  }) finish: EventEmitter<IconChooserResult>;

  @State() query: string = '';

  @State() isQuerying: boolean = false;

  @State() isInitialLoading: boolean = true;

  @State() hasQueried: boolean = false;

  @State() icons: IconLookup[] = [];

  @State() styleFilterEnabled: boolean = false;

  @State() styleFilters: StyleFilters = {
    fas: false,
    far: false,
    fad: false,
    fat: false,
    fab: false,
    fal: false,
    fak: false
  };

  @State() kitMetadata: KitMetadata;

  resolvedVersion: string;

  isProEnabled: boolean;

  watchingForSvgReplacements: boolean = false;

  constructor() {
    this.toggleStyleFilter = this.toggleStyleFilter.bind(this)
  }

  // TODO: replace this placeholder logic with, probably, real API calls
  // that handle resolving the version.
  resolveVersion(version) {
    switch(version) {
      case '5.x':
      case 'latest':
        return '5.15.3'
      case '6.x':
        return '6.0.0-beta1'
      default:
        return version
    }
  }

  async loadKitMetadata() {
    const response = await this.handleQuery(
      `
      query {
        me {
          kit(token:"${ this.kitToken }") {
            version
            technologySelected
            licenseSelected
            name
            iconUploads {
              name
              unicode
              version
              width
              height
              path
            }
          }
        }
      }
      `
    )

    // TODO: consider real error handling.
    if(get(response, 'errors')) {
      console.error('GraphQL query errors', response.errors)
      throw new Error('GraphQL query errors')
    }

    const kit = get(response, 'data.me.kit')
    this.kitMetadata = kit
  }

  async preload() {
    if(!this.kitToken) {
      return
    }

    await this.loadKitMetadata()
  }

  activateDefaultStyleFilters() {
    this.styleFilterEnabled = true
    this.styleFilters.fas = true
    this.styleFilters.fab = true
    if(this.mayHaveIconUploads()) {
      this.styleFilters.fak = true
    }
  }

  setupFontAwesome() {

    if(this.kitToken) {
      setupKit(document, this.host.shadowRoot, this.kitToken)
    } else if (!!this.cdnUrl && 'string' === typeof this.cdnUrl) {
      if(this.cdnUrl.match('\.js$')) {
        setupCdnSvg(document, this.host.shadowRoot, this.cdnUrl)
      } else if (this.cdnUrl.match('\.css$')) {
        setupCdnWebfont(document, this.host.shadowRoot, this.cdnUrl)
      } else {
        throw new Error(`Unrecognized cdn-url provided to fa-icon-chooser. Expected something ending .js or .css, but got: ${ this.cdnUrl }`)
      }
    } else {
      throw new Error("missing kitToken or cdnUrl for loading Font Awesome inside fa-icon-chooser")
    }

    this.maybeWatchSvg()
  }

  componentWillLoad() {
      this.query = ''

      this.setupFontAwesome()

      this.preload()
      .then(() => {
        this.resolvedVersion = this.resolveVersion(
          get(this, 'kitMetadata.version') || this.version
        )

        this.isProEnabled = (get(this, 'kitMetadata.licenseSelected') === 'pro')
          || this.pro

        // TODO: figure out some real error handling here.
        if(! this.resolvedVersion ) {
          throw new Error('invalid state: there must be a resolved version')
        }

        const searchTerm = sample(['animals', 'business', 'travel', 'games', 'communication'])

        return this.updateQueryResults(searchTerm)
      })
      .then(() => {
        this.activateDefaultStyleFilters()

        this.isInitialLoading = false
      })
      .catch(e => {
        // TODO: implement real error handling
        console.error('WHOOPS!', e.toString())
      })
  }

  async updateQueryResults(query: string) {
    if(size(query) === 0) return

    this.isQuerying = true

    const response = await this.handleQuery(
      `
      query {
        search(version:"${ this.resolvedVersion }", query: "${ query }", first: 10) {
          id
          label
          membership {
            free
            pro
          }
        }
      }`
    )

    // TODO: test the case where data.search is null (which would happen if the API
    // server returns a not_found)
    const iconUploads = get(this, 'kitMetadata.iconUploads', []).map(i => {
      return { prefix: 'fak', iconName: i.name }
    })

    this.icons = (get(response, 'data.search') || [])
      .reduce((acc: Array<IconLookup>, result: any) => {
        const { id, membership } = result

        const styles = membership.free

        if(this.isProEnabled && !!membership.pro) {
          membership.pro
            .filter(style => !membership.free.includes(style))
            .forEach(style => styles.push(style))
        }

        styles.map(style => {
          const prefix = STYLE_RESULT_TO_PREFIX[style]

          acc.push({
            iconName: id,
            prefix
          })
        })

        return acc
    }, iconUploads)

    this.hasQueried = true
    this.isQuerying = false
  }

  updateQueryResultsWithDebounce = debounce( query => {
      this.updateQueryResults(query)
      .catch(e => {
        // TODO: implement real error handling
        console.error(e)
      })
  }, 500 )

  filteredIcons(): IconLookup[] {
    if(!this.styleFilterEnabled) return this.icons

    return this.icons.filter(({ prefix }) => this.styleFilters[prefix])
  }

  resetStyleFilter(): void {
    Object.keys(this.styleFilters).forEach(style => {
      this.styleFilters[style] = false
    })

    this.styleFilterEnabled = false
  }

  isOnlyEnabledStyleFilter(style: string): boolean {
    if(this.styleFilters[style]) {
      const foundAnotherEnabledStyleFilter = !!Object.keys(this.styleFilters).find(styleFilter => {
        if(styleFilter === style) return false // the current style doesn't count

        return this.styleFilters[styleFilter]
      })

      return !foundAnotherEnabledStyleFilter
    }

    return false
  }

  showCheckedStyleIcon(style: string) {
    return this.styleFilterEnabled && this.styleFilters[style]
  }

  toggleStyleFilter(style: string): void {
    if(this.styleFilterEnabled) {
      // If we're turning "off" the last style filter, this has the effect
      // if disabling the master style filter as well.
      if(this.isOnlyEnabledStyleFilter(style)) {
        this.styleFilters = { ...this.styleFilters, [style]: !this.styleFilters[style] }
        this.styleFilterEnabled = false
      } else {
        // simply toggle this style
        this.styleFilters = { ...this.styleFilters, [style]: !this.styleFilters[style] }
      }
    } else {
      this.styleFilters = { ...this.styleFilters, [style]: true }
      this.styleFilterEnabled = true
    }
  }

  isV6() {
    return this.resolvedVersion && this.resolvedVersion[0] === '6'
  }

  isDuotoneAvailable() {
    return this.isProEnabled && !!this.resolvedVersion.match('(5\.[1-9][0-9]+\.)|^6\.')
  }

  mayHaveIconUploads() {
    return !!this.kitToken && this.isProEnabled
  }

  hasIconUploads() {
    return size(get(this, 'kitMetadata.iconUploads'))
  }

  onKeyUp(e: any): void {
    this.query = e.target.value
    if(size(this.query) > 0) {
      this.updateQueryResultsWithDebounce(this.query)
    }
  }

  preventDefaultFormSubmit(e) {
    e.preventDefault()
    e.stopPropagation()
  }

  maybeWatchSvg() {
    // TODO: maybe set up some types for the FontAwesome config.
    const config: any = (window as any).FontAwesome

    // If there's no global config, then this is not Font Awesome SVG/JS, so
    // we have nothing more to do here.
    if(!config) return

    // If we've already been hooked up for auto replacement on this element,
    // don't set it up again.
    if(this.watchingForSvgReplacements) return

    const dom: any = config.dom
    const watch: Function = dom.watch

    this.watchingForSvgReplacements = true

    const style = document.createElement('style')
    style.setAttribute('type', 'text/css')
    var textNode = document.createTextNode((dom.css as Function)());
    style.appendChild(textNode);
    style.media = 'all';
    this.host.shadowRoot.appendChild(style)

    watch({
      autoReplaceSvgRoot: this.host.shadowRoot,
      observeMutationsRoot: this.host.shadowRoot
    })
  }

  render() {
    if(this.isInitialLoading) {
      return <div class="fa-icon-chooser">loading...</div>
    }

    return <div class="fa-icon-chooser">
      <form id="search-form" onSubmit={ this.preventDefaultFormSubmit }>
        <label htmlFor="search" class="sr-only">Search the v6 Beta Icons</label>
        <div class="wrap-search with-icon-before">
          <i class="fas fa-search icons-search-decorative"></i>
          <input type="text" name="search" id="search" class="rounded" value={this.query} onKeyUp={this.onKeyUp.bind(this)} placeholder="Search for icons by name, category, or keyword"></input>
        </div>
        <div class="icons-style-menu-listing display-flex flex-items-center">
          <div class="wrap-icons-style-choice size-sm tablet:size-md margin-3xs column">
            <input id="icons-style-solid" checked={ this.styleFilterEnabled && this.styleFilters.fas } onChange={() => this.toggleStyleFilter('fas') } type="checkbox" name="icons-style" class="input-checkbox-custom"></input>
            <label htmlFor="icons-style-solid" class="icons-style-choice padding-y-xl padding-x-md margin-0 display-flex flex-column flex-items-center">
              <span class="position-relative margin-bottom-sm">
                {
                  this.showCheckedStyleIcon('fas')
                  ? <span key="a"><i class="checked-icon fas fa-grin-tongue fa-fw fa-2x"></i></span>
                  : <span key="b"><i class="unchecked-icon fas fa-smile fa-fw fa-2x"></i></span>
                }
              </span>
              <span class="sr-only">Show </span>solid<span class="sr-only"> style icons</span>
            </label>
          </div>
          <div class="wrap-icons-style-choice size-sm tablet:size-md margin-3xs column">
            <input id="icons-style-regular" checked={ this.styleFilterEnabled && this.styleFilters.far } onChange={() => this.toggleStyleFilter('far') } type="checkbox" name="icons-style" class="input-checkbox-custom"></input>
            <label htmlFor="icons-style-regular" class="icons-style-choice padding-y-xl padding-x-md margin-0 display-flex flex-column flex-items-center ">
              <span class="position-relative margin-bottom-sm">
                {
                  this.showCheckedStyleIcon('far')
                  ? <span key="a"><i class="checked-icon far fa-grin-tongue fa-fw fa-2x"></i></span>
                  : <span key="b"><i class="unchecked-icon far fa-smile fa-fw fa-2x"></i></span>
                }
              </span>
              <span class="sr-only">Show </span>regular<span class="sr-only"> style icons</span>
            </label>
          </div>
          {
            this.isProEnabled &&
            <div class="wrap-icons-style-choice size-sm tablet:size-md margin-3xs column">
              <input id="icons-style-light" checked={ this.styleFilterEnabled && this.styleFilters.fal } onChange={() => this.toggleStyleFilter('fal') } type="checkbox" name="icons-style" class="input-checkbox-custom"></input>
              <label htmlFor="icons-style-light" class="icons-style-choice padding-y-xl padding-x-md margin-0 display-flex flex-column flex-items-center ">
                <span class="position-relative margin-bottom-sm">
                  {
                    this.showCheckedStyleIcon('fal')
                    ? <span key="a"><i class="checked-icon fal fa-grin-tongue fa-fw fa-2x"></i></span>
                    : <span key="b"><i class="unchecked-icon fal fa-smile fa-fw fa-2x"></i></span>
                  }
                </span>
                <span class="sr-only">Show </span>light<span class="sr-only"> style icons</span>
              </label>
            </div>
          }
          { this.isV6() &&
            <div class="wrap-icons-style-choice size-sm tablet:size-md margin-3xs column">
              <input id="icons-style-thin" checked={ this.styleFilterEnabled && this.styleFilters.fat } onChange={() => this.toggleStyleFilter('fat') } type="checkbox" name="icons-style" class="input-checkbox-custom"></input>
              <label htmlFor="icons-style-thin" class="icons-style-choice padding-y-xl padding-x-md margin-0 display-flex flex-column flex-items-center ">
                <span class="position-relative margin-bottom-sm">
                  {
                    this.showCheckedStyleIcon('fat')
                    ? <span key="a"><i class="checked-icon fat fa-grin-tongue fa-fw fa-2x"></i></span>
                    : <span key="b"><i class="unchecked-icon fat fa-smile fa-fw fa-2x"></i></span>
                  }
                </span>
                <span class="sr-only">Show </span>thin<span class="sr-only"> style icons</span>
              </label>
            </div>
          }
          {
            this.isDuotoneAvailable() &&
            <div class="wrap-icons-style-choice size-sm tablet:size-md margin-3xs column">
              <input id="icons-style-duotone" checked={ this.styleFilterEnabled && this.styleFilters.fad } onChange={() => this.toggleStyleFilter('fad') } type="checkbox" name="icons-style" class="input-checkbox-custom"></input>
              <label htmlFor="icons-style-duotone" class="icons-style-choice padding-y-xl padding-x-md margin-0 display-flex flex-column flex-items-center ">
                <span class="position-relative margin-bottom-sm">
                  {
                    this.showCheckedStyleIcon('fad')
                    ? <span key="a"><i class="checked-icon fad fa-grin-tongue fa-fw fa-2x"></i></span>
                    : <span key="b"><i class="unchecked-icon fad fa-smile fa-fw fa-2x"></i></span>
                  }
                </span>
                <span class="sr-only">Show </span>duotone<span class="sr-only"> style icons</span>
              </label>
            </div>
          }
          <div class="wrap-icons-style-choice size-sm tablet:size-md margin-3xs column">
            <input id="icons-style-brands" checked={ this.styleFilterEnabled && this.styleFilters.fab } onChange={() => this.toggleStyleFilter('fab') } type="checkbox" name="icons-style" class="input-checkbox-custom"></input>
            <label htmlFor="icons-style-brands" class="icons-style-choice padding-y-xl padding-x-md margin-0 display-flex flex-column flex-items-center ">
              <span class="position-relative margin-bottom-sm">
                <i class="fab fa-font-awesome fa-fw fa-2x"></i>
              </span>
              <span class="sr-only">Show </span>brands<span class="sr-only"> style icons</span>
            </label>
          </div>
          {
            this.mayHaveIconUploads() &&
            <div class="wrap-icons-style-choice size-sm tablet:size-md margin-3xs column">
              <input id="icons-style-uploads" checked={ this.styleFilterEnabled && this.styleFilters.fak } onChange={() => this.toggleStyleFilter('fak') } type="checkbox" name="icons-style" class="input-checkbox-custom"></input>
              <label htmlFor="icons-style-uploads" class="icons-style-choice padding-y-xl padding-x-md margin-0 display-flex flex-column flex-items-center ">
                <span class="position-relative margin-bottom-sm">
                  <i class="fas fa-icons fa-fw fa-2x"></i>
                </span>
                <span class="sr-only">Show </span>Uploaded<span class="sr-only"> icons</span>
              </label>
            </div>
          }
        </div>
      </form>
      <div class="wrap-icon-listing margin-y-lg">
        { !this.isQuerying &&
          this.mayHaveIconUploads() &&
          !this.hasIconUploads() &&
          this.styleFilterEnabled &&
          this.styleFilters.fak &&
          <article class="text-center margin-2xl">
            This kit contains no uploaded icons.
          </article>
        }
        {
          this.isQuerying
          ? <article class="message-loading text-center margin-2xl">
              <i class="message-icon far fa-compass fa-spin fa-4x margin-top-xs" />
              <h2>Loading Icons</h2>
            </article>
          : (size(this.filteredIcons()) > 0
              ? <div class="icon-listing">
                  {this.filteredIcons().map(icon =>
                  <article class="wrap-icon" key={ `${icon.prefix}-${ icon.iconName }`}>
                    <button class="icon subtle display-flex flex-column flex-items-center flex-content-center" onClick={() => this.finish.emit(icon)}>
                        <i class={ `${ icon.prefix } fa-2x fa-${ icon.iconName }` }></i>
                      <span class="icon-name size-xs text-truncate margin-top-lg">{`${ icon.iconName }`}</span>
                      </button>
                  </article>
                  )}
                </div>
              : <article class="message-noresults text-center margin-2xl">
                  <i class="message-icon far fa-frown fa-4x margin-top-xs"></i>
                  <h2>Sorry, we couldn't find anything for that...</h2>
                  <p class="muted">You could try a different search or <a href="https://fontawesome.com/" target="_blank">go Pro and upload your own</a>!</p>
                </article>
            )
        }
      </div>
    </div>;
  }
}
