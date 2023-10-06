import { Component, Event, Element, EventEmitter, Prop, State, h } from '@stencil/core';
import { get, size, debounce } from 'lodash';
import {
  freeCdnBaseUrl,
  kitAssetsBaseUrl,
  buildIconChooserResult,
  createFontAwesomeScriptElement,
  IconUpload,
  defaultIcons,
  familyStyleToPrefix,
  IconUploadLookup,
  IconChooserResult,
  UrlTextFetcher,
  CONSOLE_MESSAGE_PREFIX,
  isValidSemver,
  IconLookup,
} from '../../utils/utils';
import { faSadTear, faTire } from '../../utils/icons';
import { slotDefaults } from '../../utils/slots';
import { IconPrefix } from '@fortawesome/fontawesome-common-types';
import semver from 'semver';

export type QueryHandler = (document: string) => Promise<any>;

export type StyleFilters = {
  [prefix in IconPrefix]: boolean;
};

type KitMetadata = {
  version: string;
  technologySelected: string;
  licenseSelected: string;
  name: string;
  iconUploads: Array<IconUpload> | null;
};

const DISPLAY_NONE = { display: 'none' };

/**
 * @slot fatal-error-heading - heading for fatal error message
 * @slot fatal-error-detail - details for fatal error message
 * @slot start-view-heading - heading for message on default view before search
 * @slot start-view-detail - detail for message on default view before search
 * @slot initial-loading-view-heading - heading for initial loading view
 * @slot initial-loading-view-detail - detail for initial loading view
 * @slot search-field-label-free - Search Font Awesome Free Icons
 * @slot search-field-label-pro - Search Font Awesome Pro Icons
 * @slot search-field-placeholder - search field placeholder
 * @slot searching-free - Searching Free
 * @slot searching-pro - Searching Pro
 * @slot light-requires-pro - tooltip for light style requiring Pro
 * @slot thin-requires-pro - tooltip for thin style requiring Pro
 * @slot duotone-requires-pro - message about requirements for accessing duotone icons
 * @slot sharp-solid-requires-pro - message about requirements for accessing sharp solid icons
 * @slot sharp-regular-requires-pro - message about requirements for accessing sharp regular icons
 * @slot sharp-light-requires-pro - message about requirements for accessing sharp light icons
 * @slot uploaded-requires-pro - message about requirements for accessing kit icon uploads
 * @slot kit-has-no-uploaded-icons - message about a kit having no icon uploads
 * @slot no-search-results-heading - no search results message heading
 * @slot no-search-results-detail - no seach results message detail
 * @slot suggest-icon-upload - message suggesting to try uploading a custom icon to a kit
 * @slot get-fontawesome-pro - message about getting Font Awesome Pro with link to fontawesome.com
 * @slot sharp-solid-style-filter-sr-message - screen reader only message for style filter: sharp solid
 * @slot sharp-regular-style-filter-sr-message - screen reader only message for style filter: sharp regular
 * @slot sharp-light-style-filter-sr-message - screen reader only message for style filter: sharp light
 * @slot solid-style-filter-sr-message - screen reader only message for style filter: solid
 * @slot regular-style-filter-sr-message - screen reader only message for style filter: regular
 * @slot light-style-filter-sr-message - screen reader only message for style filter: light
 * @slot thin-style-filter-sr-message - screen reader only message for style filter: thin
 * @slot duotone-style-filter-sr-message - screen reader only message for style filter: duotone
 * @slot brands-style-filter-sr-message - screen reader only message for style filter: brands
 * @slot uploaded-style-filter-sr-message - screen reader only message for style filter: uploaded
 */
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
   * Must be a valid semantic version, as parsed by the [semver NPM](https://www.npmjs.com/package/semver),
   * like 5.5.13 or 6.0.0-beta1.
   */
  @Prop() version?: string;

  /**
   * Placeholder text for search form.
   *
   * Use this to provide translatable text.
   */
  @Prop() searchInputPlaceholder?: string;

  /**
   * Required callback function which is responsible for taking a given GraphQL
   * query document and returns a Promise that resolves to a JavaScript object
   * corresponding to the body of the associated network request, same as
   * what would be produced by [Response.json()](https://developer.mozilla.org/en-US/docs/Web/API/Response/json).
   *
   * The query document is compliant with the GraphQL API at [api.fontawesome.com](https://fontawesome.com/v5.15/how-to-use/graphql-api/intro/getting-started).
   *
   * The implementation is responsible for handling any authorization that may be
   * necessary to fulfill the request. For example, any time a kit is used to
   * drive the Icon Chooser, it will be necessary to authorize GraphQL API requests
   * sent to api.fontawesome.com with the [`kits_read` scope](https://fontawesome.com/v5.15/how-to-use/graphql-api/auth/scopes).
   */
  @Prop() handleQuery: QueryHandler;

  /**
   * Callback function that returns the text body of a response that
   * corresponds to an HTTP GET request for the given URL. For example, it
   * would be the result of [Response.text()](https://developer.mozilla.org/en-US/docs/Web/API/Response/text).
   */
  @Prop() getUrlText: UrlTextFetcher;

  /**
   * Clients of the Icon Chooser should listen for this event in order to handle
   * the result of the user's interaction.
   */
  @Event({
    eventName: 'finish',
    composed: true,
    cancelable: true,
    bubbles: true,
  })
  finish: EventEmitter<IconChooserResult>;

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
    fak: false,
    fass: false,
    fasr: false,
    fasl: false,
  };

  @State() kitMetadata: KitMetadata;

  @State() fatalError: boolean = false;

  @State() familyStyles: object = {
    classic: {
      solid: {
        prefix: 'fas'
      },
      regular: {
        prefix: 'far'
      },
      light: {
        prefix: 'fal'
      },
      thin: {
        prefix: 'fat'
      },
      brands: {
        prefix: 'fab'
      }
    },
    duotone: {
      solid: {
        prefix: 'fad'
      }
    },
    sharp: {
      solid: {
        prefix: 'fass'
      },
      regular: {
        prefix: 'fasr'
      },
      light: {
        prefix: 'fasl'
      }
    },
    kit: {
      custom:
      {
        prefix: 'fak'
      }
    },
    'kit-duotone': {
      custom: {
        prefix: 'fakd'
      }
    }
  };

  @State() selectedFamily: string = 'classic';

  @State() selectedStyle: string = 'solid';

  svgApi?: any;

  svgFetchBaseUrl?: string;

  commonFaIconProps: any;

  defaultIcons: any;

  activeSlotDefaults: any = {};

  constructor() {
    this.toggleStyleFilter = this.toggleStyleFilter.bind(this);
  }

  familyNameToLabel(name: string): string {
    return name
  }

  styleNameToLabel(name: string): string {
    return name
  }

  getFamilies(): string[] {
    return Object.keys(this.familyStyles)
  }

  selectFamily(e: any): void {
    const fam = e.target.value
    if ('string' === typeof fam && 'object' === typeof this.familyStyles[fam]) {
      this.selectedFamily = fam
    }
  }

  selectStyle(e: any): void {
    const style = e.target.value
    if ('string' === typeof style && 'string' === typeof this.selectedFamily && 'object' === typeof this.familyStyles[this.selectedFamily]) {
      this.selectedStyle = style
    }
  }

  getStylesForSelectedFamily(): string[] {
    if ('string' === typeof this.selectedFamily && 'object' === typeof this.familyStyles[this.selectedFamily]) {
      return Object.keys(this.familyStyles[this.selectedFamily])
    } else {
      return []
    }
  }

  async loadKitMetadata() {
    const response = await this.handleQuery(
      `
      query {
        me {
          kit(token:"${this.kitToken}") {
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
      `,
    );

    if (get(response, 'errors')) {
      console.error('Font Awesome Icon Chooser GraphQL query errors', response.errors);
      throw new Error();
    }

    const kit = get(response, 'data.me.kit');
    this.kitMetadata = kit;
  }

  activateDefaultStyleFilters() {
    this.styleFilterEnabled = true;
    this.styleFilters.fas = true;
    this.styleFilters.fab = true;
  }

  resolvedVersion() {
    return get(this, 'kitMetadata.release.version') || this.version;
  }

  pro(): boolean {
    return get(this, 'kitMetadata.licenseSelected') === 'pro';
  }

  async preload() {
    if (this.kitToken) {
      return this.loadKitMetadata();
    } else {
      return Promise.resolve();
    }
  }

  // Any slot for which the client does not provide content will be assigned
  // a default.
  setupSlots() {
    for (const slotName in slotDefaults) {
      const slotContentElement = this.host.querySelector(`[slot="${slotName}"]`);
      if (!slotContentElement) {
        this.activeSlotDefaults[slotName] = slotDefaults[slotName];
      }
    }
  }

  slot(name: string) {
    return (this.activeSlotDefaults && this.activeSlotDefaults[name]) || <slot name={name}></slot>;
  }

  componentWillLoad() {
    if (!this.kitToken && !isValidSemver(this.version)) {
      console.error(`${CONSOLE_MESSAGE_PREFIX}: either a kit-token or valid semantic version is required.`, this);
      this.fatalError = true;
      return;
    }

    this.query = '';

    this.isInitialLoading = true;

    this.setupSlots();

    this.preload()
      .then(() => {
        const pro = this.pro();

        const baseUrl = this.kitToken ? kitAssetsBaseUrl(pro) : freeCdnBaseUrl();

        if (pro) {
          this.svgFetchBaseUrl = `${baseUrl}/releases/v${this.resolvedVersion()}/svgs`;
        }

        const svgApi = get(window, 'FontAwesome');

        if (svgApi) {
          // If FA SVG/JS is already present in the outer DOM, just use it.
          return Promise.resolve(svgApi);
        } else {
          // Otherwise, we'll add it to the outer DOM, but disable it from doing
          // anything automated that would have global affect--other than assigning
          // itself to the global window.FontAwesome.
          return createFontAwesomeScriptElement(this.getUrlText, pro, this.resolvedVersion(), baseUrl, this.kitToken).then(scriptElement => {
            document.head.appendChild(scriptElement);
            return get(window, 'FontAwesome');
          });
        }
      })
      .then(svgApi => {
        this.svgApi = svgApi;
        const dom = get(window, 'FontAwesome.dom');
        const style = document.createElement('STYLE');
        style.setAttribute('type', 'text/css');
        const css = document.createTextNode(dom.css());
        style.appendChild(css);
        this.host.shadowRoot.appendChild(style);
        this.defaultIcons = defaultIcons;

        this.setIcons(this.defaultIcons, this.iconUploadsAsIconUploadLookups());

        this.activateDefaultStyleFilters();

        if (this.mayHaveIconUploads() && size(get(this, 'kitMetadata.iconUploads')) > 0) {
          this.styleFilters.fak = true;
        }

        this.commonFaIconProps = {
          svgApi: get(window, 'FontAwesome'),
          pro: this.pro(),
          svgFetchBaseUrl: this.svgFetchBaseUrl,
          kitToken: this.kitToken,
          getUrlText: this.getUrlText,
        };

        this.isInitialLoading = false;
      })
      .catch(e => {
        console.error(e);
        this.isInitialLoading = false;
        this.fatalError = true;
      });
  }

  async updateQueryResults(query: string) {
    if (size(query) === 0) return;

    this.isQuerying = true;

    const response = await this.handleQuery(
      `
      query {
        search(version:"${this.resolvedVersion()}", query: "${query}", first: 100) {
          id
          label
          familyStylesByLicense {
            free {
              family
              style
            }
            pro {
              family
              style
            }
          }
        }
      }`,
    );

    const filteredIconUploads = this.iconUploadsAsIconUploadLookups().filter(({ iconName }) => {
      return iconName.indexOf(query) > -1;
    });

    let iconSearchResults = response;

    if (!Array.isArray(get(iconSearchResults, 'data.search'))) {
      console.warn(`${CONSOLE_MESSAGE_PREFIX}: search results may be inaccurate since 'handleQuery' returned an unexpected value:`, response);
      iconSearchResults = { data: { search: [] } };
    }

    this.setIcons(iconSearchResults, filteredIconUploads);

    this.hasQueried = true;
    this.isQuerying = false;
  }

  iconUploadsAsIconUploadLookups(): Array<IconUploadLookup> {
    return get(this, 'kitMetadata.iconUploads', []).map(i => {
      return { prefix: 'fak', iconName: i.name, iconUpload: i };
    });
  }

  setIcons(searchResultIcons: any, iconUploads: Array<IconUploadLookup>) {
    this.icons = (get(searchResultIcons, 'data.search') || []).reduce((acc: Array<IconLookup>, result: any) => {
      const { id, familyStylesByLicense } = result;

      const familyStyles = this.pro() ? familyStylesByLicense.pro : familyStylesByLicense.free;

      familyStyles.map(familyStyle => {
        acc.push({
          iconName: id,
          prefix: familyStyleToPrefix(familyStyle),
        });
      });

      return acc;
    }, iconUploads);
  }

  updateQueryResultsWithDebounce = debounce(query => {
    this.updateQueryResults(query).catch(e => {
      console.error(e);
      this.fatalError = true;
    });
  }, 500);

  filteredIcons(): Array<IconLookup | IconUploadLookup> {
    if (!this.styleFilterEnabled) return this.icons;

    return this.icons.filter(({ prefix }) => this.styleFilters[prefix]);
  }

  resetStyleFilter(): void {
    Object.keys(this.styleFilters).forEach(style => {
      this.styleFilters[style] = false;
    });

    this.styleFilterEnabled = false;
  }

  isOnlyEnabledStyleFilter(style: string): boolean {
    if (this.styleFilters[style]) {
      const foundAnotherEnabledStyleFilter = !!Object.keys(this.styleFilters).find(styleFilter => {
        if (styleFilter === style) return false; // the current style doesn't count

        return this.styleFilters[styleFilter];
      });

      return !foundAnotherEnabledStyleFilter;
    }

    return false;
  }

  showCheckedStyleIcon(style: string) {
    return this.styleFilterEnabled && this.styleFilters[style];
  }

  toggleStyleFilter(style: string): void {
    if (this.styleFilterEnabled) {
      // If we're turning "off" the last style filter, this has the effect
      // if disabling the master style filter as well.
      if (this.isOnlyEnabledStyleFilter(style)) {
        this.styleFilters = { ...this.styleFilters, [style]: !this.styleFilters[style] };
        this.styleFilterEnabled = false;
      } else {
        // simply toggle this style
        this.styleFilters = { ...this.styleFilters, [style]: !this.styleFilters[style] };
      }
    } else {
      this.styleFilters = { ...this.styleFilters, [style]: true };
      this.styleFilterEnabled = true;
    }
  }

  isV6() {
    const version = this.resolvedVersion();
    return version && version[0] === '6';
  }

  isDuotoneAvailable() {
    return this.pro() && !!this.resolvedVersion().match('(5.[1-9][0-9]+.)|^6.');
  }

  isSharpSolidAvailable() {
    return this.pro() && semver.satisfies(this.resolvedVersion(), '>=6.2.0');
  }

  isSharpLightAvailable() {
    return this.pro() && semver.satisfies(this.resolvedVersion(), '>=6.4.0');
  }

  isSharpRegularAvailable() {
    return this.pro() && semver.satisfies(this.resolvedVersion(), '>=6.3.0');
  }

  mayHaveIconUploads() {
    return this.pro();
  }

  hasIconUploads() {
    return size(get(this, 'kitMetadata.iconUploads'));
  }

  onKeyUp(e: any): void {
    this.query = e.target.value;
    if (size(this.query) === 0) {
      this.setIcons(this.defaultIcons, this.iconUploadsAsIconUploadLookups());
    } else {
      this.updateQueryResultsWithDebounce(this.query);
    }
  }

  preventDefaultFormSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  render() {
    const falDisabled = !this.pro();
    const faslDisabled = !this.isSharpLightAvailable();
    const fassDisabled = !this.isSharpSolidAvailable();
    const fasrDisabled = !this.isSharpRegularAvailable();
    const fatDisabled = !(this.isV6() && this.pro());
    const fadDisabled = !this.isDuotoneAvailable();
    const fakDisabled = !this.mayHaveIconUploads();

    if (this.fatalError) {
      return (
        <div class="fa-icon-chooser">
          <div class="message-loading text-center margin-2xl">
            <h3>{this.slot('fatal-error-heading')}</h3>
            <p>{this.slot('fatal-error-detail')}</p>
          </div>
        </div>
      );
    }

    if (this.isInitialLoading) {
      return (
        <div class="fa-icon-chooser">
          <div class="message-loading text-center margin-2xl">
            <h3>Loading...</h3>
          </div>
        </div>
      );
    }

    return (
      <div class="fa-icon-chooser">
        <form id="search-form" onSubmit={this.preventDefaultFormSubmit}>
          <label htmlFor="search" class="margin-bottom-xs margin-left-xl sr-only">
            {this.pro() ? this.slot('search-field-label-pro') : this.slot('search-field-label-free')} {this.resolvedVersion()}
          </label>
          <div class="tablet:margin-bottom-xl">
            <div class="wrap-search margin-bottom-3xs with-icon-before">
              <fa-icon {...this.commonFaIconProps} stylePrefix="fas" name="search" class="icons-search-decorative"></fa-icon>
              <input
                type="text"
                name="search"
                id="search"
                class="rounded"
                value={this.query}
                onKeyUp={this.onKeyUp.bind(this)}
                placeholder={this.searchInputPlaceholder || slotDefaults['search-field-placeholder']}
              ></input>
            </div>
          </div>

          <select name="family-select" onChange={this.selectFamily.bind(this)}>
            {this.getFamilies().map((family: string) =>
              <option value={family}>{family}</option>
            )}
          </select>

          <select name="style-select" onChange={this.selectStyle.bind(this)}>
            {this.getStylesForSelectedFamily()
              .map((style: string) =>
                <option value={style}>{style}</option>
              )}
          </select>

        </form>
        <p class="muted size-sm text-center margin-bottom-xs">
          {this.pro() ? this.slot('searching-pro') : this.slot('searching-free')} {this.resolvedVersion()}
        </p>
        <div class="wrap-icon-listing margin-y-lg">
          {!this.isQuerying && this.mayHaveIconUploads() && !this.hasIconUploads() && this.styleFilterEnabled && this.styleFilters.fak && (
            <article class="text-center margin-2xl">
              <p class="muted size-sm">{this.slot('kit-has-no-uploaded-icons')}</p>
            </article>
          )}
          {!this.isQuerying && this.query === '' && (
            <article class="text-center margin-y-2xl line-length-lg margin-auto">
              <h3 class="margin-bottom-md">{this.slot('start-view-heading')}</h3>
              <p class="margin-bottom-3xl">{this.slot('start-view-detail')}</p>
            </article>
          )}
          {this.isQuerying ? (
            <article class="message-loading text-center margin-2xl">
              <fa-icon {...this.commonFaIconProps} icon={faTire} class="message-icon fa-2x margin-top-xs fa-spin fa-fw"></fa-icon>
              <h3>{this.slot('initial-loading-view-header')}</h3>
              <p key="a" class="margin-y-md muted">
                {this.slot('initial-loading-view-detail')}
              </p>
            </article>
          ) : size(this.filteredIcons()) > 0 ? (
            <div class="icon-listing">
              {this.filteredIcons().map(iconLookup => (
                <article class="wrap-icon" key={`${iconLookup.prefix}-${iconLookup.iconName}`}>
                  <button class="icon subtle display-flex flex-column flex-items-center flex-content-center" onClick={() => this.finish.emit(buildIconChooserResult(iconLookup))}>
                    <fa-icon {...this.commonFaIconProps} size="2x" stylePrefix={iconLookup.prefix} name={iconLookup.iconName} iconUpload={get(iconLookup, 'iconUpload')} />

                    <span class="icon-name size-sm text-truncate margin-top-lg">{`${iconLookup.iconName}`}</span>
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <article class="message message-noresults text-center margin-2xl">
              <span key="b">
                <fa-icon {...this.commonFaIconProps} icon={faSadTear} class="message-icon fa-2x margin-top-xs"></fa-icon>
              </span>
              <h2 class="message-title margin-top-lg">{this.slot('no-search-results-heading')}</h2>
              <p key="c" class="size-lg">
                {this.slot('no-search-results-detail')}
              </p>
              <p key="d" class="muted display-block">
                {this.pro() ? this.slot('suggest-icon-upload') : this.slot('get-fontawesome-pro')}
              </p>
            </article>
          )}
        </div>
      </div>
    );
  }
}
