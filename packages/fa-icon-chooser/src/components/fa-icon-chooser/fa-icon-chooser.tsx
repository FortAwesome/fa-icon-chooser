import { Component, Element, Event, EventEmitter, h, Prop, State } from '@stencil/core';
import { capitalize, debounce, find, get, set, size } from 'lodash';
import {
  buildDefaultIconsSearchResult,
  buildIconChooserResult,
  CONSOLE_MESSAGE_PREFIX,
  createFontAwesomeScriptElement,
  freeCdnBaseUrl,
  IconChooserResult,
  IconLookup,
  IconUpload,
  IconUploadLookup,
  isValidSemver,
  kitAssetsBaseUrl,
  UrlTextFetcher,
} from '../../utils/utils';
import { faSadTear, faTire } from '../../utils/icons';
import { slotDefaults } from '../../utils/slots';
import { IconDefinition } from '../../utils/utils';

export type QueryHandler = (document: string, variables?: object, options?: object) => Promise<any>;

type KitMetadata = {
  version: string;
  technologySelected: string;
  licenseSelected: string;
  name: string;
  iconUploads: Array<IconUpload> | null;
};

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
 * @slot kit-has-no-uploaded-icons - message about a kit having no icon uploads
 * @slot no-search-results-heading - no search results message heading
 * @slot no-search-results-detail - no seach results message detail
 * @slot suggest-icon-upload - message suggesting to try uploading a custom icon to a kit
 * @slot get-fontawesome-pro - message about getting Font Awesome Pro with link to fontawesome.com
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
  @Element()
  host: HTMLElement;

  /**
   * A kit token identifying a kit in which to find icons. Takes precedent over
   * version prop if both are present.
   */
  @Prop()
  kitToken?: string;

  /**
   * Version to use for finding and loading icons when kitToken is not provided.
   * Must be a valid semantic version, as parsed by the [semver NPM](https://www.npmjs.com/package/semver),
   * like 5.5.13 or 6.0.0-beta1.
   */
  @Prop()
  version?: string;

  /**
   * Placeholder text for search form.
   *
   * Use this to provide translatable text.
   */
  @Prop()
  searchInputPlaceholder?: string;

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
  @Prop()
  handleQuery: QueryHandler;

  /**
   * Callback function that returns the text body of a response that
   * corresponds to an HTTP GET request for the given URL. For example, it
   * would be the result of [Response.text()](https://developer.mozilla.org/en-US/docs/Web/API/Response/text).
   */
  @Prop()
  getUrlText: UrlTextFetcher;

  /**
   * For internal use when testing. This overrides the base URL to use for fetching
   * assets from a Kit. Under normal circumstances, this should not be set.
   * The default values will be set appropriately using pre-configured official CDN URLs.
   */
  @Prop()
  _assetsBaseUrl: string | undefined;

  /**
   * Clients of the Icon Chooser should listen for this event in order to handle
   * the result of the user's interaction.
   *
   * The emitted `IconChooserResult` will not include SVG data (as an `IconDefinition`) when
   * prohibited by the client's license.
   *
   * License terms for SVG icon data emitted are governed by the terms on the Font Awesome [plans page](https://fontawesome.com/plans),
   * which are elaborated on the Font Awesome [support page](https://fontawesome.com/support).
   */
  @Event({
    eventName: 'finish',
    composed: true,
    cancelable: true,
    bubbles: true,
  })
  finish: EventEmitter<IconChooserResult>;

  @State()
  query: string = '';

  @State()
  isQuerying: boolean = false;

  @State()
  isInitialLoading: boolean = false;

  @State()
  hasQueried: boolean = false;

  @State()
  icons: IconLookup[] = [];

  @State()
  kitMetadata: KitMetadata;

  @State()
  fatalError: boolean = false;

  // familyStyles starts with only the values that would be present in any
  // release, whether Pro or Free. After resolving an initial metadata query,
  // it will be updated to include the familyStyles appropriate for the active
  // version and license of Font Awesome.
  @State()
  familyStyles: object = {
    classic: {
      solid: {
        prefix: 'fas',
      },
      regular: {
        prefix: 'far',
      },
      brands: {
        prefix: 'fab',
      },
    },
  };

  // This should be populated as a reverse lookup when updating familyStyles.
  @State()
  prefixToFamilyStyle: object = {};

  @State()
  selectedFamily: string = 'classic';

  @State()
  selectedStyle: string = 'solid';

  svgApi?: any;

  svgFetchBaseUrl?: string;

  commonFaIconProps: any;

  defaultIcons: any;

  activeSlotDefaults: any = {};

  embedSvgPrefixes: Set<string> = new Set([]);

  familyNameToLabel(name: string): string {
    return name;
  }

  styleNameToLabel(name: string): string {
    return name;
  }

  getFamilies(): string[] {
    return Object.keys(this.familyStyles).sort();
  }

  selectFamily(e: any): void {
    const fam = e.target.value;
    if ('string' === typeof fam && 'object' === typeof this.familyStyles[fam]) {
      this.selectedFamily = fam;
      const styles = this.getStylesForSelectedFamily();
      this.selectedStyle = styles[0];
    }
  }

  selectStyle(e: any): void {
    const style = e.target.value;
    if ('string' === typeof style && 'string' === typeof this.selectedFamily && 'object' === typeof this.familyStyles[this.selectedFamily]) {
      this.selectedStyle = style;
    }
  }

  getPrefixForFamilyStyle(family: string, style: string): string | undefined {
    return get(this.familyStyles, [family, style, 'prefix']);
  }

  getSelectedPrefix(): string | undefined {
    return this.getPrefixForFamilyStyle(this.selectedFamily, this.selectedStyle);
  }

  getStylesForSelectedFamily(): string[] {
    if ('string' === typeof this.selectedFamily && 'object' === typeof this.familyStyles[this.selectedFamily]) {
      return Object.keys(this.familyStyles[this.selectedFamily]).sort();
    } else {
      return [];
    }
  }

  buildFamilyStyleReverseLookup(): void {
    const acc = {};

    for (const family in this.familyStyles) {
      for (const style in this.familyStyles[family]) {
        acc[this.familyStyles[family][style].prefix] = { family, style };
      }
    }

    this.prefixToFamilyStyle = acc;
  }

  prefixToFamilyStylePathSegment(prefix: string): string | undefined {
    const family = get(this.prefixToFamilyStyle, [prefix, 'family']);
    const style = get(this.prefixToFamilyStyle, [prefix, 'style']);

    if (!family || !style) {
      return;
    }

    if ('duotone' === family && 'solid' === style) {
      return 'duotone';
    }

    return 'classic' === family ? style : `${family}-${style}`;
  }

  async loadKitMetadata() {
    const response = await this.handleQuery(
      `
      query KitMetadata($token: String!) {
        me {
          kit(token: $token) {
            version
            technologySelected
            licenseSelected
            name
            permits {
              embedProSvg {
                prefix
                family
              }
            }
            release {
              version
              familyStyles {
                family
                style
                prefix
              }
            }
            iconUploads {
              name
              unicode
              version
              width
              height
              pathData
            }
          }
        }
      }
      `,
      { token: this.kitToken },
      { cache: true },
    );

    if (get(response, 'errors')) {
      console.error('Font Awesome Icon Chooser GraphQL query errors', response.errors);
      throw new Error();
    }

    const kit = get(response, 'data.me.kit');
    this.kitMetadata = kit;

    const embedProSvg = get(kit, 'permits.embedProSvg', []);
    const familyStyles = get(kit, 'release.familyStyles', []);

    if (embedProSvg.length > 0) {
      // Extract unique families from embedProSvg permits
      const families = [...new Set(embedProSvg.map(permit => permit.family).filter(family => typeof family === 'string'))] as string[];

      // Filter familyStyles to only include permitted families
      const filteredFamilyStyles = familyStyles.filter(fs => families.includes(fs.family));

      // Update familyStyles with the permitted families
      this.updateFamilyStyles(filteredFamilyStyles);

      if (this.pro()) {
        // For a Pro kit, only the SVGs for the permitted familyStyles may be embedded.
        get(response, 'data.me.kit.permits.embedProSvg', []).forEach(fs => this.embedSvgPrefixes.add(fs.prefix));
      } else {
        // All Free SVGs in a Free kit may be embedded.
        filteredFamilyStyles.forEach(fs => this.embedSvgPrefixes.add(fs.prefix));
      }
    }

    // Temporary pro lite and pro lite plus handling
    // ALL styles will be shown to pro.lite users until we have a better solution in place
    if (kit.licenseSelected === 'pro' && embedProSvg.length === 0) {
      const releaseFamilyStyles = get(kit, 'release.familyStyles', []);
      this.updateFamilyStyles(releaseFamilyStyles);
    }

    const kitFamilyStyles = [];
    const iconUploads = get(response, 'data.me.kit.iconUploads', []);

    if (find(iconUploads, i => i.pathData.length === 1)) {
      kitFamilyStyles.push({ family: 'kit', style: 'custom', prefix: 'fak' });
    }

    if (find(iconUploads, i => i.pathData.length > 1)) {
      kitFamilyStyles.push({
        family: 'kit-duotone',
        style: 'custom',
        prefix: 'fakd',
      });
    }

    if (kitFamilyStyles.length > 0) {
      this.updateFamilyStyles(kitFamilyStyles);
    }
  }

  updateFamilyStyles(familyStyles: Array<any>) {
    for (const fs of familyStyles) {
      set(this.familyStyles, [fs.family, fs.style, 'prefix'], fs.prefix);
    }

    this.buildFamilyStyleReverseLookup();
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
    this.buildFamilyStyleReverseLookup();

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
        const baseUrl = this._assetsBaseUrl || (this.kitToken ? kitAssetsBaseUrl(pro) : freeCdnBaseUrl());
        const version = this.resolvedVersion();

        if (pro) {
          // For FA7+ and newer, use svg-objects endpoint with JSON format
          // For FA6 and older, use svgs endpoint with SVG format
          const majorVersion = parseInt(version.split('.')[0]);
          this.svgFetchBaseUrl = `${baseUrl}/releases/v${version}/${majorVersion >= 7 ? 'svg-objects' : 'svgs'}`;
        } else {
          // If we haven't already added prefixes for the Free familyStyles, add them now.
          if (this.embedSvgPrefixes.size === 0) {
            Object.keys(this.prefixToFamilyStyle).forEach(prefix => this.embedSvgPrefixes.add(prefix));
          }
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
        this.defaultIcons = buildDefaultIconsSearchResult(this.familyStyles);

        this.setIcons(this.defaultIcons, this.iconUploadsAsIconUploadLookups());

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
      query Search($version: String!, $query: String!) {
        search(version: $version, query: $query, first: 100) {
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
      { version: this.resolvedVersion(), query },
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
      const [prefix, pathData] = i.pathData.length > 1 ? ['fakd', i.pathData] : ['fak', i.pathData[0]];
      return { prefix, iconName: i.name, iconUpload: { ...i, pathData } };
    });
  }

  setIcons(searchResultIcons: any, iconUploads: Array<IconUploadLookup>) {
    this.icons = (get(searchResultIcons, 'data.search') || []).reduce((acc: Array<IconLookup>, result: any) => {
      const { id, familyStylesByLicense } = result;

      const familyStyles = this.pro() ? familyStylesByLicense.pro : familyStylesByLicense.free;

      familyStyles.map(fs => {
        const prefix = this.getPrefixForFamilyStyle(fs.family, fs.style);
        acc.push({
          iconName: id,
          prefix,
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
    const selectedPrefix = this.getSelectedPrefix();

    if (!selectedPrefix) {
      return [];
    }

    return this.icons.filter(({ prefix }) => prefix === selectedPrefix);
  }

  isV6() {
    const version = this.resolvedVersion();
    return version && version[0] === '6';
  }

  mayHaveIconUploads() {
    return this.pro();
  }

  hasIconUploads() {
    return size(get(this, 'kitMetadata.iconUploads'));
  }

  onSearchInputChange(e: any): void {
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

  labelForFamilyOrStyle(labelOrFamily: string): string {
    return labelOrFamily
      .split('-')
      .map(term => capitalize(term))
      .join(' ');
  }

  shouldEmitSvgData(prefix: string): boolean {
    // This override is subject to the Font Awesome plan license terms
    // at https://fontawesome.com/plans and https://fontawesome.com/support.
    // At the time of writing, only the Font Awesome official WordPress plugin is
    // permitted to embed SVGs for Pro Lite plans. If you're a developer who wants
    // your integration or plugin to be licensed to embed SVGs for Pro Lite plans, please
    // contact hello@fontawesome.com.
    const svgEmbedOverrideCallback = get(window, '__FA_SVG_EMBED__');

    let override = false;

    if (typeof svgEmbedOverrideCallback === 'function') {
      override = !!svgEmbedOverrideCallback();
    }

    return override || this.embedSvgPrefixes.has(prefix);
  }

  render() {
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
          <div class="margin-bottom-md">
            <div class="wrap-search margin-bottom-3xs with-icon-before">
              <fa-icon
                {...this.commonFaIconProps}
                stylePrefix="fas"
                familyStylePathSegment={this.prefixToFamilyStylePathSegment('fas')}
                name="search"
                class="icons-search-decorative"
              ></fa-icon>
              <input
                type="text"
                name="search"
                id="search"
                class="rounded"
                value={this.query}
                onInput={this.onSearchInputChange.bind(this)}
                placeholder={this.searchInputPlaceholder || slotDefaults['search-field-placeholder']}
              ></input>
            </div>
          </div>

          <div class="style-selectors row">
            <div class="column-6">
              <select name="family-select" onChange={this.selectFamily.bind(this)}>
                {this.getFamilies().map((family: string) => (
                  <option selected={family === this.selectedFamily} value={family}>
                    {this.labelForFamilyOrStyle(family)}
                  </option>
                ))}
              </select>
            </div>

            <div class="column-6">
              <select name="style-select" onChange={this.selectStyle.bind(this)}>
                {this.getStylesForSelectedFamily().map((style: string) => (
                  <option selected={style == this.selectedStyle} value={style}>
                    {this.labelForFamilyOrStyle(style)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
        <p class="muted size-sm text-center margin-top-xs margin-bottom-xs">
          {this.pro() ? this.slot('searching-pro') : this.slot('searching-free')} {this.resolvedVersion()}
        </p>
        <div class="wrap-icon-listing margin-y-lg">
          {!this.isQuerying && this.mayHaveIconUploads() && !this.hasIconUploads() && ['kit', 'kit-duotone'].includes(this.selectedFamily) && (
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
              {this.filteredIcons().map(iconLookup => {
                let iconDefinition = null;
                const setIconDefinition = (currentIconDefinition: IconDefinition) => {
                  if ('object' === typeof currentIconDefinition) {
                    iconDefinition = { ...currentIconDefinition };
                  }
                };
                return (
                  <article class="wrap-icon" key={`${iconLookup.prefix}-${iconLookup.iconName}`}>
                    <button
                      class="icon subtle display-flex flex-column flex-items-center flex-content-center"
                      onClick={() => this.finish.emit(buildIconChooserResult(this.shouldEmitSvgData(iconLookup.prefix) ? iconDefinition : iconLookup))}
                    >
                      <fa-icon
                        {...this.commonFaIconProps}
                        size="2x"
                        stylePrefix={iconLookup.prefix}
                        emitIconDefinition={setIconDefinition}
                        familyStylePathSegment={this.prefixToFamilyStylePathSegment(iconLookup.prefix)}
                        name={iconLookup.iconName}
                        iconUpload={get(iconLookup, 'iconUpload')}
                      />

                      <span class="icon-name size-sm text-truncate margin-top-lg">{`${iconLookup.iconName}`}</span>
                    </button>
                  </article>
                );
              })}
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
