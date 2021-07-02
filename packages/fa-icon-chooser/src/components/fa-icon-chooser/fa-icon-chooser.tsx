import { Component, Element, Event, EventEmitter, Prop, State, h } from '@stencil/core'
import { get, size, debounce, sample } from 'lodash'
import { IconLookup } from '@fortawesome/fontawesome-common-types'
import { resolveVersion } from '../../utils/utils'

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

enum FaTechnology {
  KitSvg = 1,
  KitWebfont,
  CdnSvg,
  CdnWebfont,
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
   * Optional CDN integrity attribute. When set the crossorigin="anonymous" attribute
   * will also be added to the <script> or <link> tag that loads Font Awesome from
   * the CDN, causing that resource's integrity to be checked.
   */
  @Prop() integrity?: string;

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

  technology: FaTechnology;

  cdnSubdomain?: string;

  runSvgReplacementAfterRender: boolean = false;

  constructor() {
    this.toggleStyleFilter = this.toggleStyleFilter.bind(this)
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
  }

  componentWillLoad() {
      this.query = ''

      if(!this.kitToken) {
        if(this.cdnUrl && 'string' === typeof this.cdnUrl) {
          if(this.pro) {
            this.cdnSubdomain = 'pro'
          } else {
            this.cdnSubdomain = 'use'
          }

          if(this.cdnUrl.match('\.js$')) {
            this.technology = FaTechnology.CdnSvg
          } else if (this.cdnUrl.match('\.css$')) {
            this.technology = FaTechnology.CdnWebfont
          } else {
            throw new Error(`Unrecognized cdn-url provided to fa-icon-chooser. Expected something ending .js or .css, but got: ${ this.cdnUrl }`)
          }
        } else {
          throw new Error("missing a kit-token or cdn-url attribute for loading Font Awesome inside fa-icon-chooser")
        }
      }

      this.preload()
      .then(() => {
        this.resolvedVersion = resolveVersion(
          get(this, 'kitMetadata.version') || this.version
        )

        this.isProEnabled = (get(this, 'kitMetadata.licenseSelected') === 'pro')
          || this.pro

        if(this.kitToken) {
          const kitTechnology = this.kitTechnology()
          if(kitTechnology) {
            this.technology = kitTechnology
          }
        }

        this.setupFontAwesome()

        // TODO: figure out some real error handling here.
        if(! this.resolvedVersion ) {
          throw new Error('invalid state: there must be a resolved version')
        }

        const searchTerm = sample(['animals', 'business', 'travel', 'games', 'communication'])

        return this.updateQueryResults(searchTerm)
      })
      .then(() => {
        this.activateDefaultStyleFilters()

        if(this.mayHaveIconUploads() && size(get(this, 'kitMetadata.iconUploads')) > 0) {
          this.styleFilters.fak = true
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
        search(version:"${ this.resolvedVersion }", query: "${ query }", first: 100) {
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

  kitTechnology(): FaTechnology | undefined {
    switch( get(this, 'kitMetadata.technologySelected') ) {
      case 'webfonts':
        return FaTechnology.KitWebfont
      case 'svg':
        return FaTechnology.KitSvg
    }
  }

  // TODO: add better handling for the case where this componnet needs to be
  // more self-sufficient--loading from CDN or Kit itself when it's not already
  // available in the outer DOM. And yet, when loading, it needs to be done in
  // such a way that minimizes global effects. For example, if this component
  // adds a <script> to load FA SVG/JS, it should disable autoReplaceSvg so that
  // behavior is not suddenly activated globally on the outer DOM.
  // But what about the webfont case? Somehow, we'd need to get the appropriate
  // @font-face rules added to the outer DOM, but only if they're not already
  // present. We may need to put in hooks to track what fonts are loaded in
  // the outer DOM, similar to the kit loader e2e testing.
  setupFontAwesome() {
    const isKitAlreadySetupInOuterDom = this.kitToken && !!get(window, 'FontAwesomeKitConfig')

    const isFaSvgJsAlreadySetupInOuterDom =
      (isKitAlreadySetupInOuterDom && this.technology == FaTechnology.KitSvg)
      || ( this.technology === FaTechnology.CdnSvg && !!get(window, 'FontAwesome'))

    let faLinks = []
    document.querySelectorAll('link').forEach(l => {
      if(
        ('string' === typeof l.href)
        && (
          !!l.href.toString().match('fontawesome\.com/\.+\.css')
          || !!l.href.toString().match('fontawesome\.com/\.+\.css\?')
        )
      ) {
        faLinks.push(l)
      }
    })

    const isFaWebfontCdnAlreadSetupInOuterDom = faLinks.length > 0

    if(!this.technology) {
      // We should never get this error, because the constructor should have already validated inputs.
      throw new Error('could not determine which Font Awesome technology is in use')
    }

    if( this.technology === FaTechnology.CdnWebfont ) {
      if(!isFaWebfontCdnAlreadSetupInOuterDom) {
        // In this case, we're setting up Webfont via CDN, and the outer DOM
        // does not have a <link> to the CDN CSS resource. That means the outer
        // DOM will not have the @font-face rules that must be present in the outer
        // DOM. @font-face rules must be present in the outer DOM, in order to
        // trigger the loading of the webfont file resources. A @font-face rule
        // appearing in the Shadow DOM has no effect. So it's not enough to add
        // the <link> to the Shadow DOM. It also needs to be added to the outer
        // DOM.

        // For now, we're being a bit heavy-handed about it, and just linking to
        // all.css in either case. A more granular way to load just @font-face
        // rules and not ALL of the style rules would be to link to each style
        // individually, like regular.css or solid.css. Those assets include
        // just the corresponding @font-face rule.

        // However, an icon chooser is all about seeing the available options,
        // across any available styles. So assuming that we should always be working
        // with all.css in this context isn't terrible.

        const link = this.createCdnLinkElement()
        document.head.appendChild(link)
      }

      // We need to add the CDN <link> to the web component's Shadow DOM, regardless
      // of whether it is present in the outer DOM, because even if it's in the
      // outer DOM, it will only inherit the @font-face rules, not the rest of
      // the style rules.
      const link = this.createCdnLinkElement()
      this.host.shadowRoot.appendChild(link)
    }

    if( this.technology === FaTechnology.CdnSvg ) {
      if(!isFaSvgJsAlreadySetupInOuterDom) {
        const script = document.createElement('script')
        script.setAttribute('src', `https://${ this.cdnSubdomain }.fontawesome.com/releases/v${this.resolvedVersion}/js/all.js`)

        if(this.integrity) {
          script.setAttribute('integrity', this.integrity)
          script.setAttribute('crossorigin', 'anonymous')
        }

        // We must disable autoReplaceSvg and autoInsertCss because this JavaScript
        // will run in global space and by default will operate on the outer DOM,
        // even though we're adding the <script> to the Shadow DOM.
        window['FontAwesomeConfig'] = {
          autoAddCss: false,
          autoReplaceSvg: false
        }

        const set = newValue => {
          window['__FontAwesome__IconChooser'] = newValue
          this.setupSvgStyleInShadowDom()
        }

        // We need to intercept the assignment to the global Font Awesome and
        // only trigger the rest of the Shadow DOM setup after that.
        Object.defineProperty(window, 'FontAwesome', {
          enumerable: true,
          configurable: false,
          get() { return window['__FontAwesome__IconChooser'] },
          set
        })

        this.runSvgReplacementAfterRender = true
        this.host.shadowRoot.appendChild(script)
      } else {
        this.setupSvgStyleInShadowDom()
        this.setupSvgWatchInShadowDom()
      }
    }

    if( this.technology === FaTechnology.KitSvg ) {
      if(!isKitAlreadySetupInOuterDom) {
        const script = this.createKitScriptElement()

        // We're adding a <script> to load the kit, which will in turn load
        // Font Awesome SVG/JS. When FA SVG/JS is loaded, it will run in global
        // space and we want to make sure it's not impacting the outer DOM by default
        // So we'll disable the automation features and then enable them only
        // within the Shadow DOM.
        window['FontAwesomeConfig'] = {
          autoAddCss: false,
          autoReplaceSvg: false
        }

        const set = newValue => {
          window['__FontAwesome__IconChooser'] = newValue
          this.setupSvgStyleInShadowDom()
        }

        // We need to intercept the assignment to the global Font Awesome and
        // only trigger the rest of the Shadow DOM setup after that.
        Object.defineProperty(window, 'FontAwesome', {
          enumerable: true,
          configurable: false,
          get() { return window['__FontAwesome__IconChooser'] },
          set
        })

        this.runSvgReplacementAfterRender = true
        this.host.shadowRoot.appendChild(script)
      } else {
        this.setupSvgStyleInShadowDom()
        this.setupSvgWatchInShadowDom()
      }
    }

    if( this.technology === FaTechnology.KitWebfont ) {
      if(!isKitAlreadySetupInOuterDom) {
        // CAVEAT! In this scenario, we're setting up a Webfont Kit whose <script>
        // has not already been loaded in the outer DOM. So we have to add it
        // within the Shadow DOM. However, there's no way currently stop it from
        // applying its styles to the outer DOM, because the kit will inject
        // set of <style> elements into the outer DOM.
        //
        // This might mean that we need a way to configure how a kit is loaded
        // to prevent some things from happening
        const script = this.createKitScriptElement()
        this.host.shadowRoot.appendChild(script)
      }

      this.copyWebfontKitStyleElementsToShadowDom()
    }
  }

  createKitScriptElement() {
    const script = document.createElement('script')
    script.setAttribute('src', `https://kit.fontawesome.com/${this.kitToken}.js`)
    script.setAttribute('crossorigin', 'anonymous')

    return script
  }

  setupSvgStyleInShadowDom() {
    // TODO: maybe set up some types for the FontAwesome config.
    const config: any = (window as any).FontAwesome

    // If there's no global config, then this is not Font Awesome SVG/JS, so
    // we have nothing more to do here.
    if(!config) return

    // If we've already been hooked up for auto replacement on this element,
    // don't set it up again.
    if(this.watchingForSvgReplacements) return

    const dom: any = config.dom

    const style = document.createElement('style')
    style.setAttribute('type', 'text/css')
    var textNode = document.createTextNode((dom.css as Function)());
    style.appendChild(textNode);
    style.media = 'all';
    this.host.shadowRoot.appendChild(style)
  }

  setupSvgWatchInShadowDom() {
    const watch: Function | undefined = get(window, 'FontAwesome.dom.watch')

    if(!watch) return

    this.watchingForSvgReplacements = true

    watch({
      autoReplaceSvgRoot: this.host.shadowRoot,
      observeMutationsRoot: this.host.shadowRoot
    })
  }

  createCdnLinkElement() {
    const link = document.createElement('link')
    link.setAttribute('href', `https://${ this.cdnSubdomain }.fontawesome.com/releases/v${this.resolvedVersion}/css/all.css`)
    link.setAttribute('rel', 'stylesheet')

    if(this.integrity) {
      link.setAttribute('integrity', this.integrity)
      link.setAttribute('crossorigin', 'anonymous')
    }

    return link
  }

  copyWebfontKitStyleElementsToShadowDom() {
    // TODO: figure out if there's a more efficient way to do this than just copying
    const mainKitStyle = document.querySelector('style#fa-main') as HTMLStyleElement

    if(mainKitStyle) {
      const newStyleEl = document.createElement('style')
      const cssText = document.createTextNode(mainKitStyle.innerText)
      newStyleEl.setAttribute('type', 'text/css')
      newStyleEl.appendChild(cssText)
      this.host.shadowRoot.appendChild(newStyleEl)
    }

    const kitUploadStyle = document.querySelector('style#fa-kit-upload') as HTMLStyleElement

    if(kitUploadStyle) {
      const newStyleEl = document.createElement('style')
      const cssText = document.createTextNode(kitUploadStyle.innerText)
      newStyleEl.setAttribute('type', 'text/css')
      newStyleEl.appendChild(cssText)
      this.host.shadowRoot.appendChild(newStyleEl)
    }

    return
  }

  componentDidRender() {
    if(this.runSvgReplacementAfterRender) {
      const i2svg: Function | undefined = get(window, 'FontAwesome.dom.i2svg')

      if(i2svg) {
        i2svg({ node: this.host.shadowRoot })
      }
    }
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
            <p class="muted size-sm">This kit contains no uploaded icons.</p>
          </article>
        }
        {
          this.isQuerying
          ? <article class="message-loading text-center margin-2xl">
              <span key="a"><i class="message-icon fas fa-circle-notch fa-spin fa-2x margin-top-xs" /></span>
              <h4 class="message-title margin-top-sm">Loading icons</h4>
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
              : <article class="message message-noresults text-center margin-2xl">
                  <span key="b"><i class="message-icon far fa-frown fa-3x margin-top-xs"></i></span>
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
