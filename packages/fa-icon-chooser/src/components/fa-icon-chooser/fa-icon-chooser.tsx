import { Component, Event, Element, EventEmitter, Prop, State, h } from '@stencil/core'
import { get, size, debounce } from 'lodash'
import { IconLookup } from '@fortawesome/fontawesome-common-types'
import { freeCdnBaseUrl, kitAssetsBaseUrl, buildIconChooserResult, createFontAwesomeScriptElement, IconUpload, defaultIcons, IconPrefix, STYLE_TO_PREFIX } from '../../utils/utils'
import { faSadTear } from '../../utils/icons'

export interface IconChooserResult extends IconLookup {
  class?: string;
  style?: string;
}

export type QueryHandler = (document: string) => Promise<any>;

export type StyleFilters = {
  [prefix in IconPrefix]: boolean;
}

type KitMetadata = {
  version: string;
  technologySelected: string;
  licenseSelected: string;
  name: string;
  iconUploads: Array<IconUpload> | null;
}

interface IconUploadLookup extends IconLookup {
  iconUpload: IconUpload
}

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
   * A kit token identifying a kit in which to find icons. Takes precedent over
   * version prop if both are present.
   */
  @Prop() kitToken?: string;

  /**
   * Version to use for finding and loading icons when kitToken is not provided.
   */
  @Prop() version?: string;

  @Prop() handleQuery: QueryHandler;

  @Event({
    eventName: 'finish',
    composed: true,
    cancelable: true,
    bubbles: true,
  }) finish: EventEmitter<IconChooserResult>;

  @State() query: string = '';

  @State() isQuerying: boolean = false;

  @State() isInitialLoading: boolean = false;

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

  svgApi?: any;

  svgFetchBaseUrl?: string;

  commonFaIconProps: any;

  defaultIcons: any

  constructor() {
    this.toggleStyleFilter = this.toggleStyleFilter.bind(this)

    if(!this.kitToken && !this.version) {
      throw new Error('Font Awesome Icon Chooser requires either kit-token or version prop')
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
            release {
              version
            }
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

  activateDefaultStyleFilters() {
    this.styleFilterEnabled = true
    this.styleFilters.fas = true
    this.styleFilters.fab = true
  }

  resolvedVersion() {
    return get(this, 'kitMetadata.release.version') || this.version
  }

  pro() {
    return get(this, 'kitMetadata.licenseSelected') === 'pro'
  }

  async preload() {
    if(this.kitToken) {
      return this.loadKitMetadata()
    } else {
      return Promise.resolve()
    }
  }

  componentWillLoad() {
      this.query = ''

      this.isInitialLoading = true

      this.preload()
      .then(() => {
        const pro = this.pro()

        const baseUrl = this.kitToken ? kitAssetsBaseUrl(pro) : freeCdnBaseUrl()

        if(pro) {
          this.svgFetchBaseUrl = `${ baseUrl }/releases/v${this.resolvedVersion()}/svgs`
        }

        const svgApi = get(window, "FontAwesome")

        if(svgApi) {
          // If FA SVG/JS is already present in the outer DOM, just use it.
          return Promise.resolve(svgApi)
        } else {
          // Otherwise, we'll add it to the outer DOM, but disable it from doing
          // anything automated that would have global affect--ther than assigning
          // itself to the global window.FontAwesome.
          return createFontAwesomeScriptElement(pro, this.resolvedVersion(), baseUrl, this.kitToken)
            .then(scriptElement => {
              document.head.appendChild(scriptElement)
              return get(window, 'FontAwesome')
            })
        }
      })
      .then(svgApi  => {
        this.svgApi = svgApi
        const dom = get(window, 'FontAwesome.dom')
        const style = document.createElement('STYLE')
        style.setAttribute('type', 'text/css')
        const css = document.createTextNode(dom.css())
        style.appendChild(css)
        this.host.shadowRoot.appendChild(style)

        // If we're in pro v6, then we need to add the thin style as being available
        // because our defaultIcons fixture doesn't include thin.
        const adjustedDefaultIcons = (this.pro && this.isV6())
          ? get(defaultIcons, 'data.search', []).map(i => {
            const proStyles = get(i, 'membership.pro', [])

            if(size(proStyles) > 1) {
              proStyles.push('thin')
              i.membership.pro = proStyles
            }

            return i
          })
          : get(defaultIcons, 'data.search', [])

        this.defaultIcons = { data: { search: adjustedDefaultIcons } }

        this.setIcons(this.defaultIcons, this.iconUploadsAsIconUploadLookups())

        this.activateDefaultStyleFilters()

        if(this.mayHaveIconUploads() && size(get(this, 'kitMetadata.iconUploads')) > 0) {
          this.styleFilters.fak = true
        }

        this.commonFaIconProps = {
          svgApi: get(window, 'FontAwesome'),
          pro: this.pro(),
          svgFetchBaseUrl: this.svgFetchBaseUrl,
          kitToken: this.kitToken
        }

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
        search(version:"${ this.resolvedVersion() }", query: "${ query }", first: 100) {
          id
          label
          membership {
            free
            pro
          }
        }
      }`
    )

    this.setIcons(response, this.iconUploadsAsIconUploadLookups())

    // TODO: test the case where data.search is null (which would happen if the API
    // server returns a not_found)

    this.hasQueried = true
    this.isQuerying = false
  }

  iconUploadsAsIconUploadLookups(): Array<IconUploadLookup> {
    return get(this, 'kitMetadata.iconUploads', []).map(i => {
      return { prefix: 'fak', iconName: i.name, iconUpload: i }
    })
  }

  setIcons(searchResultIcons: Array<any>, iconUploads: Array<IconUploadLookup>) {
    this.icons = (get(searchResultIcons, 'data.search') || [])
      .reduce((acc: Array<IconLookup>, result: any) => {
        const { id, membership } = result

        const styles = membership.free

        if(this.pro() && !!membership.pro) {
          membership.pro
            .filter(style => !membership.free.includes(style))
            .forEach(style => styles.push(style))
        }

        styles.map(style => {
          const prefix = STYLE_TO_PREFIX[style]

          acc.push({
            iconName: id,
            prefix
          })
        })

        return acc
    }, iconUploads)
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
    const version = this.resolvedVersion()
    return version && version[0] === '6'
  }

  isDuotoneAvailable() {
    return this.pro() && !!this.resolvedVersion().match('(5\.[1-9][0-9]+\.)|^6\.')
  }

  mayHaveIconUploads() {
    return this.pro()
  }

  hasIconUploads() {
    return size(get(this, 'kitMetadata.iconUploads'))
  }

  onKeyUp(e: any): void {
    this.query = e.target.value
    if(size(this.query) === 0) {
      this.setIcons(this.defaultIcons, this.iconUploadsAsIconUploadLookups())
    } else {
      this.updateQueryResultsWithDebounce(this.query)
    }
  }

  preventDefaultFormSubmit(e) {
    e.preventDefault()
    e.stopPropagation()
  }

  render() {
    if(this.isInitialLoading) {
      return <div class="fa-icon-chooser">
        <div class="message-loading text-center margin-2xl">
          <h3>Fetching icons</h3>
          <p class="margin-y-md muted">When this thing gets up to 88 mph...</p>
        </div>
      </div>
    }

    return <div class="fa-icon-chooser">
      <form id="search-form" onSubmit={ this.preventDefaultFormSubmit }>
        <label htmlFor="search" class="sr-only">Search the v6 Beta Icons</label>
        <div class="wrap-search with-icon-before">
          <fa-icon {...this.commonFaIconProps} stylePrefix="fas" name="search" class="icons-search-decorative"></fa-icon>
          <input type="text" name="search" id="search" class="rounded" value={this.query} onKeyUp={this.onKeyUp.bind(this)} placeholder="Search for icons by name, category, or keyword"></input>
        </div>
        <div class="icons-style-menu-listing display-flex flex-items-center">
          <div class="wrap-icons-style-choice size-sm tablet:size-md margin-3xs column">
            <input id="icons-style-solid" checked={ this.styleFilterEnabled && this.styleFilters.fas } onChange={() => this.toggleStyleFilter('fas') } type="checkbox" name="icons-style" class="input-checkbox-custom"></input>
            <label htmlFor="icons-style-solid" class="icons-style-choice padding-y-xl padding-x-md margin-0 display-flex flex-column flex-items-center">
              <span class="position-relative margin-bottom-sm">
                {
                  this.showCheckedStyleIcon('fas')
                  ? <fa-icon key="a" {...this.commonFaIconProps} name="grin-tongue" stylePrefix="fas" class="checked-icon fa-fw fa-2x"/>
                  : <fa-icon key="b" {...this.commonFaIconProps} name="smile" stylePrefix="fas" class="unchecked-icon fa-fw fa-2x"/>
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
                  ? <fa-icon key="a" {...this.commonFaIconProps} name="grin-tongue" stylePrefix="far" class="checked-icon fa-fw fa-2x"/>
                  : <fa-icon key="b" {...this.commonFaIconProps} name="smile" stylePrefix="far" class="unchecked-icon fa-fw fa-2x"/>
                }
              </span>
              <span class="sr-only">Show </span>regular<span class="sr-only"> style icons</span>
            </label>
          </div>
          {
            this.pro() &&
            <div class="wrap-icons-style-choice size-sm tablet:size-md margin-3xs column">
              <input id="icons-style-light" checked={ this.styleFilterEnabled && this.styleFilters.fal } onChange={() => this.toggleStyleFilter('fal') } type="checkbox" name="icons-style" class="input-checkbox-custom"></input>
              <label htmlFor="icons-style-light" class="icons-style-choice padding-y-xl padding-x-md margin-0 display-flex flex-column flex-items-center ">
                <span class="position-relative margin-bottom-sm">
                  {
                    this.showCheckedStyleIcon('fal')
                    ? <fa-icon key="a" {...this.commonFaIconProps} name="grin-tongue" stylePrefix="fal" class="checked-icon fa-fw fa-2x"/>
                    : <fa-icon key="b" {...this.commonFaIconProps} name="smile" stylePrefix="fal" class="unchecked-icon fa-fw fa-2x"/>
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
                    ? <fa-icon key="a" {...this.commonFaIconProps} name="grin-tongue" stylePrefix="fat" class="checked-icon fa-fw fa-2x"/>
                    : <fa-icon key="b" {...this.commonFaIconProps} name="smile" stylePrefix="fat" class="unchecked-icon fa-fw fa-2x"/>
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
                    ? <fa-icon key="a" {...this.commonFaIconProps} name="grin-tongue" stylePrefix="fad" class="checked-icon fa-fw fa-2x"/>
                    : <fa-icon key="b" {...this.commonFaIconProps} name="smile" stylePrefix="fad" class="unchecked-icon fa-fw fa-2x"/>
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
                <fa-icon {...this.commonFaIconProps} stylePrefix="fab" name="font-awesome" class="fa-fw fa-2x"/>
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
                  <fa-icon {...this.commonFaIconProps} stylePrefix="fas" name="icons" class="fa-fw fa-2x"/>
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
            <p class="muted size-sm">This kit contains no uploaded icons.</p>
          </article>
        }
        {
          this.isQuerying
          ? <article class="message-loading text-center margin-2xl">
              <fa-icon {...this.commonFaIconProps} name="circle-notch" stylePrefix="fas" class="message-icon fa-spin fa-2x margin-top-xs" />
              <h4 class="message-title margin-top-sm">Loading icons</h4>
            </article>
          : (size(this.filteredIcons()) > 0
              ? <div class="icon-listing">
                  {this.filteredIcons().map(icon =>
                  <article class="wrap-icon" key={ `${icon.prefix}-${ icon.iconName }`}>
                    <button class="icon subtle display-flex flex-column flex-items-center flex-content-center" onClick={() => this.finish.emit(buildIconChooserResult(icon))}>
                      <fa-icon
                        {...this.commonFaIconProps}
                        class='fa-2x'
                        stylePrefix={ icon.prefix }
                        name={ icon.iconName }
                        iconUpload={ get(icon, 'iconUpload') }
                      />

                      <span class="icon-name size-xs text-truncate margin-top-lg">{`${ icon.iconName }`}</span>
                      </button>
                  </article>
                  )}
                </div>
              : <article class="message message-noresults text-center margin-2xl">
                  <span key="b"><fa-icon {...this.commonFaIconProps} icon={ faSadTear } class="message-icon fa-3x margin-top-xs"></fa-icon></span>
                  <h2 class="message-title margin-top-lg">Sorry, we couldn't find anything for that.</h2>
                  <p class="size-lg">You might try a different search...</p>
                <p class="muted size-sm display-block">Or <a href="https://fontawesome.com/" target="_blank">get Font Awesome Pro</a> and upload your own icon!</p>
                </article>
            )
        }
      </div>
    </div>
  }
}
