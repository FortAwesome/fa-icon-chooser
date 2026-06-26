import { Component, Element, Event, EventEmitter, h, Prop, State } from '@stencil/core';
import capitalize from 'lodash/capitalize';
import debounce from 'lodash/debounce';
import find from 'lodash/find';
import get from 'lodash/get';
import set from 'lodash/set';
import size from 'lodash/size';
import {
  buildDefaultIconsSearchResult,
  buildIconChooserResult,
  computeCacheKey,
  CONSOLE_MESSAGE_PREFIX,
  createFontAwesomeScriptElement,
  freeCdnBaseUrl,
  FamilyStyle,
  IconChooserResult,
  searchKitIconsToIconLookups,
  showcaseIconsToIconLookups,
  IconLookup,
  IconUpload,
  IconUploadLookup,
  isValidSemver,
  kitAssetsBaseUrl,
  kitFamilyStylesFromResponse,
  showcaseCacheKeyFromResponse,
  searchModeForPrefix,
  UrlTextFetcher,
} from '../../utils/utils';
import { faSadTear, faTire } from '../../utils/icons';
import { slotDefaults, SlotDefaultsParams } from '../../utils/slots';
import { IconDefinition } from '../../utils/utils';

const DEFAULT_FAMILY_STYLES: Array<FamilyStyle> = [
  { family: 'classic', style: 'solid', prefix: 'fas' },
  { family: 'classic', style: 'regular', prefix: 'far' },
  { family: 'classic', style: 'brands', prefix: 'fab' },
];

export type QueryHandler = (document: string, variables?: object, options?: object) => Promise<any>;

type KitMetadata = {
  version: string;
  technologySelected: string;
  licenseSelected: string;
  name: string;
  kitRevision?: string | number;
  showcaseCacheKey?: string;
  iconUploads: Array<IconUpload> | null;
};

// GraphQL query used in kit mode to search a kit's subset (replaces the legacy
// top-level `search`). searchKit caps pageSize at 50, so to match the legacy
// `search(... first: 100)` reach we page through it: see updateKitQueryResults.
const SEARCH_KIT_PAGE_SIZE = 50;

const SEARCH_KIT_QUERY = `
query SearchKit($token: String!, $query: String!, $searchMode: KitSearchMode!, $page: Int!, $pageSize: Int!) {
  me {
    kit(token: $token) {
      searchKit(query: $query, searchMode: $searchMode, page: $page, pageSize: $pageSize) {
        page
        pageSize
        totalIconCount
        totalPageCount
        icons {
          __typename
          ... on IconWithVariants {
            name
            label
            unicodeHex
            variants {
              name
              unicodeHex
              familyStyle {
                family
                style
                prefix
              }
            }
          }
          ... on IconUpload {
            name
            unicodeHex
            width
            height
            pathData
          }
        }
      }
    }
  }
}`;

// GraphQL query used in kit mode for the opening showcase of one family-style
// (replaces defaultIconsSearchResult.json). One page of up to 80 official icons.
const SHOWCASE_ICONS_QUERY = `
query ShowcaseIcons($token: String!, $selector: FamilyStyleSelector!) {
  me {
    kit(token: $token) {
      showcaseIcons(selector: $selector, page: 1, pageSize: 80, limitPerFamilyStyle: 80) {
        page
        pageSize
        totalIconVariantCount
        totalPageCount
        iconVariants {
          name
          unicodeHex
          familyStyle {
            family
            style
            prefix
          }
        }
      }
    }
  }
}`;

// GraphQL query used in kit mode to load a kit's metadata: its revision, showcase
// cache key, subset family-styles, release version, and uploads.
const KIT_METADATA_QUERY = `
      query KitMetadata($token: String!) {
        me {
          kit(token: $token) {
            kitRevision
            showcaseCacheKey
            familyStylesPaginated(page: 1, pageSize: 50) {
              familyStyles {
                familyStyle {
                  family
                  style
                  prefix
                }
              }
            }
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
      `;

/**
 * @slot fatal-error-heading - heading for fatal error message
 * @slot fatal-error-detail - details for fatal error message
 * @slot start-view-heading - heading for message on default view before search; in kit mode this default names the kit ("Add Icons from Your Font Awesome <kit name> Kit")
 * @slot start-view-detail - detail for message on default view before search; in kit mode this default points to fontawesome.com/kits for editing the kit
 * @slot initial-loading-view-heading - heading for initial loading view
 * @slot initial-loading-view-detail - detail for initial loading view
 * @slot search-field-label-free - Search Font Awesome Free Icons
 * @slot search-field-label-pro - Search Font Awesome Pro Icons
 * @slot search-field-placeholder - search field placeholder
 * @slot searching-free - Searching Free; in kit mode this default names the kit and token ("You're searching the icons in your <kit name> Kit (<kit token>) set to Font Awesome Version")
 * @slot searching-pro - Searching Pro; in kit mode this default names the kit and token (same as searching-free)
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
   *
   * An optional third `options` argument may be supplied: `{ cache?: boolean, cacheKey?: string }`.
   * In kit mode, the component requests caching of the kit metadata and of each family-style's
   * page of showcase icons, by passing `{ cache: true, cacheKey }`.
   * The `cacheKey` is a self-contained identity already derived from everything that affects the
   * response (the query document, its variables, and — for showcase requests — the kit revision and
   * the kit's showcase cache key). An implementation that caches can therefore use `cacheKey` alone
   * as its cache key, without re-deriving identity from the query or variables. Implementations
   * that ignore `options` still work correctly (they simply cache less, or not at all).
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
   * Callback function that allows filtering of familyStyles
   * prior to their use in the Icon Chooser.
   *
   * This allows for further restricting which familyStyles
   * are available to the end user, beyond the filtering that may already
   * be applied according to business logic or a kit's subset.
   * @param familyStyle
   * @returns boolean - return true to include the familyStyle, false to exclude it.
   */
  @Prop()
  includeFamilyStyle: (familyStyle: FamilyStyle) => boolean = _familyStyle => true;

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

  // True while a network fetch for the selected family-style's showcase is in
  // flight (kit mode, opening view). Drives the same loading view as the initial
  // kit-metadata load so switching family-styles doesn't briefly flash the
  // "no results" message before the new showcase arrives.
  @State()
  isLoadingShowcase: boolean = false;

  @State()
  hasQueried: boolean = false;

  @State()
  icons: IconLookup[] = [];

  @State()
  kitMetadata: KitMetadata;

  @State()
  fatalError: boolean = false;

  // familyStyles starts empty, because it may be filtered not only by
  // what familyStyles are available for a given version and license of
  // Font Awesome, but also by external filtering. So there are no familyStyles
  // that are necessarily included.
  @State()
  familyStyles: object = {};

  // This should be populated as a reverse lookup when updating familyStyles.
  @State()
  prefixToFamilyStyle: { [key: string]: FamilyStyle } = {};

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

  // The kit-provided showcase cache key, captured from kit metadata. Folded into the
  // showcase request's computed cacheKey so an unchanged kit reuses cached results and a
  // changed kit (new cache key) refreshes them.
  showcaseCacheKey?: string;

  // In-memory, per-family-style cache of fetched showcase icons. Enables lazy
  // loading: each family-style's showcase is fetched at most once per component
  // lifetime (keyed by prefix), and re-selecting a style is instant.
  showcaseIconsByPrefix: { [prefix: string]: Array<IconLookup> } = {};

  // In-flight showcase fetches keyed by prefix. Concurrent requests for the same
  // family-style (e.g. rapid re-selection) share one network call, so we never
  // double-fetch a prefix.
  showcaseFetchesByPrefix: { [prefix: string]: Promise<void> } = {};

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
      this.loadShowcaseForSelectionIfNeeded();
    }
  }

  selectStyle(e: any): void {
    const style = e.target.value;
    if ('string' === typeof style && 'string' === typeof this.selectedFamily && 'object' === typeof this.familyStyles[this.selectedFamily]) {
      this.selectedStyle = style;
      this.loadShowcaseForSelectionIfNeeded();
    }
  }

  // In kit mode, lazily load the newly selected family-style's showcase for the
  // opening (no active search) view. No-op in non-kit mode or while searching.
  loadShowcaseForSelectionIfNeeded(): void {
    if (this.kitToken && '' === this.query) {
      this.fetchShowcaseForSelectedFamilyStyle().catch(e => console.error(e));
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
        const prefix = this.familyStyles[family][style].prefix;
        acc[prefix] = { family, style, prefix };
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
      KIT_METADATA_QUERY,
      { token: this.kitToken },
      {
        cache: true,
        cacheKey: computeCacheKey(KIT_METADATA_QUERY, this.kitToken),
      },
    );

    if (get(response, 'errors')) {
      console.error('Font Awesome Icon Chooser GraphQL query errors', response.errors);
      throw new Error();
    }

    const kit = get(response, 'data.me.kit');
    this.kitMetadata = kit;
    this.showcaseCacheKey = showcaseCacheKeyFromResponse(response);

    // The kit's available family-styles are its subset (Kit.familyStylesPaginated), which
    // carries { family, style, prefix } directly. This is the authoritative selector of
    // which styles are offered — it replaces the prior permits/pro/lite filtering, and is
    // never widened by the release catalog, which could otherwise surface family-styles
    // the kit's subset excludes.
    const subsetFamilyStyles = kitFamilyStylesFromResponse(response);

    this.updateFamilyStyles(subsetFamilyStyles);

    // Determine which family-styles' SVGs may be embedded from the CDN. For a Pro kit
    // that's the permitted prefixes; otherwise it's the kit's subset official styles.
    const embedProSvg = get(kit, 'permits.embedProSvg', []);
    if (this.pro()) {
      embedProSvg.forEach(fs => this.embedSvgPrefixes.add(fs.prefix));
    } else {
      subsetFamilyStyles.forEach(fs => this.embedSvgPrefixes.add(fs.prefix));
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
      let shouldInclude = true;

      try {
        shouldInclude = this.includeFamilyStyle(fs);
      } catch {}

      if (shouldInclude) {
        set(this.familyStyles, [fs.family, fs.style, 'prefix'], fs.prefix);
      }
    }

    this.buildFamilyStyleReverseLookup();
    this.ensureSelectedFamilyStyleIsValid();
  }

  // Reconciles selectedFamily/selectedStyle with the current familyStyles. The
  // initial state defaults assume Classic Solid is available, but includeFamilyStyle
  // (or other filtering) may have removed it from the available familyStyles.
  // Without this, getSelectedPrefix would
  // return undefined and filteredIcons would render empty even when matches exist.
  ensureSelectedFamilyStyleIsValid(): void {
    const stylesObjectForSelectedFamily = this.familyStyles[this.selectedFamily] || {};
    const isSelectedFamilyStyleValid = stylesObjectForSelectedFamily.hasOwnProperty(this.selectedStyle);

    if (isSelectedFamilyStyleValid) {
      return;
    }

    const filteredFamilies = Object.keys(this.familyStyles).sort();
    if (filteredFamilies.length === 0) return;
    const selectedFamily = filteredFamilies[0];
    const stylesForSelectedFamily = Object.keys(this.familyStyles[selectedFamily] || {}).sort();
    if (stylesForSelectedFamily.length === 0) return;
    this.selectedFamily = selectedFamily;
    this.selectedStyle = stylesForSelectedFamily[0];
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
      this.updateFamilyStyles(DEFAULT_FAMILY_STYLES);
      return Promise.resolve();
    }
  }

  // Any slot for which the client does not provide content will be assigned
  // a default. The defaults are computed from the (optional) kit token and name so
  // that kit-mode copy can name the kit; called with no/empty params (non-kit mode)
  // it yields the library-wide default copy.
  setupSlots(params: SlotDefaultsParams = {}) {
    const defaults = slotDefaults(params);
    for (const slotName in defaults) {
      const slotContentElement = this.host.querySelector(`[slot="${slotName}"]`);
      if (!slotContentElement) {
        this.activeSlotDefaults[slotName] = defaults[slotName];
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

    this.preload()
      .then(() => {
        // preload() has resolved, so kit metadata (including the kit name) is loaded.
        // Compute the default slot copy now so kit-mode copy can include the kit's
        // name and token; in non-kit mode these params are empty and the copy is
        // unchanged from the library-wide defaults.
        this.setupSlots({ kitToken: this.kitToken, name: get(this, 'kitMetadata.name') });

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
      .then(async svgApi => {
        this.svgApi = svgApi;
        const dom = get(window, 'FontAwesome.dom');
        const style = document.createElement('STYLE');
        style.setAttribute('type', 'text/css');
        const css = document.createTextNode(dom.css());
        style.appendChild(css);
        this.host.shadowRoot.appendChild(style);

        this.commonFaIconProps = {
          svgApi: get(window, 'FontAwesome'),
          pro: this.pro(),
          svgFetchBaseUrl: this.svgFetchBaseUrl,
          kitToken: this.kitToken,
          getUrlText: this.getUrlText,
        };

        if (this.kitToken) {
          // Kit mode: the opening view is the kit's subset-aware showcase for the
          // currently selected family-style (loaded lazily), not the library-wide default.
          await this.fetchShowcaseForSelectedFamilyStyle();
        } else {
          this.defaultIcons = buildDefaultIconsSearchResult(this.familyStyles);
          this.setIcons(this.defaultIcons, this.iconUploadsAsIconUploadLookups());
        }

        this.isInitialLoading = false;
      })
      .catch(e => {
        // On a preload failure the fatal-error view is shown; ensure its slot copy is
        // populated (kit metadata may not have loaded, so kit-specific params may be
        // empty — the fatal-error copy is not kit-specific).
        this.setupSlots({ kitToken: this.kitToken, name: get(this, 'kitMetadata.name') });
        console.error(e);
        this.isInitialLoading = false;
        this.fatalError = true;
      });
  }

  async updateQueryResults(query: string) {
    if (size(query) === 0) return;

    this.isQuerying = true;

    // In kit mode, search the kit's subset via Kit.searchKit instead of the legacy
    // top-level `search`. Non-kit mode falls through to the legacy path below.
    if (this.kitToken) {
      await this.updateKitQueryResults(query);
      this.hasQueried = true;
      this.isQuerying = false;
      return;
    }

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

  // Kit-mode search against Kit.searchKit. searchMode is CUSTOM for the kit's
  // custom-upload styles (fak/fakd) and OFFICIAL otherwise. For CUSTOM, the matched
  // names are resolved back to the kit's already-loaded uploads (which carry the
  // path data needed to render custom icons); for OFFICIAL, variants map directly
  // onto the { iconName, prefix } model.
  async updateKitQueryResults(query: string) {
    const prefix = this.getSelectedPrefix();
    const searchMode = searchModeForPrefix(prefix);

    const firstPage = await this.handleQuery(SEARCH_KIT_QUERY, {
      token: this.kitToken,
      query,
      searchMode,
      page: 1,
      pageSize: SEARCH_KIT_PAGE_SIZE,
    });

    if (!Array.isArray(get(firstPage, 'data.me.kit.searchKit.icons'))) {
      console.warn(`${CONSOLE_MESSAGE_PREFIX}: kit search results may be inaccurate since 'handleQuery' returned an unexpected value:`, firstPage);
    }

    const matchedIcons = searchKitIconsToIconLookups(firstPage);

    // searchKit caps pageSize at 50. If the result set is larger, fetch a second
    // page so we cover up to 100 icons (two pages), matching the legacy `search(first: 100)`.
    const totalIconCount = get(firstPage, 'data.me.kit.searchKit.totalIconCount', 0);
    const totalPageCount = get(firstPage, 'data.me.kit.searchKit.totalPageCount', 0);
    const hasMore = totalPageCount > 1 || totalIconCount > SEARCH_KIT_PAGE_SIZE;

    if (hasMore) {
      const secondPage = await this.handleQuery(SEARCH_KIT_QUERY, {
        token: this.kitToken,
        query,
        searchMode,
        page: 2,
        pageSize: SEARCH_KIT_PAGE_SIZE,
      });

      if (!Array.isArray(get(secondPage, 'data.me.kit.searchKit.icons'))) {
        console.warn(`${CONSOLE_MESSAGE_PREFIX}: kit search results may be inaccurate since 'handleQuery' returned an unexpected value:`, secondPage);
      }

      matchedIcons.push(...searchKitIconsToIconLookups(secondPage));
    }

    if ('CUSTOM' === searchMode) {
      const matchedNames = new Set(matchedIcons.map(({ iconName }) => iconName));
      this.icons = this.iconUploadsAsIconUploadLookups().filter(({ iconName }) => matchedNames.has(iconName));
    } else {
      this.icons = matchedIcons;
    }
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

  // Rebuild this.icons (the opening showcase view) from every family-style's
  // showcase fetched so far, plus the kit's uploaded custom icons. filteredIcons()
  // then narrows to the selected family-style's prefix for rendering.
  setShowcaseIcons() {
    const showcaseIcons = [].concat(...Object.keys(this.showcaseIconsByPrefix).map(prefix => this.showcaseIconsByPrefix[prefix]));

    this.icons = [...showcaseIcons, ...this.iconUploadsAsIconUploadLookups()];
  }

  // Kit-mode opening view for the currently selected family-style. Loads lazily:
  // custom (fak/fakd) styles come from the kit's uploads (no fetch); official styles
  // are fetched once per prefix and cached in-memory. The showcase request is cached
  // by the host under a self-contained cacheKey hashed from the query, its variables,
  // the kit revision, and the kit-provided showcaseCacheKey.
  async fetchShowcaseForSelectedFamilyStyle() {
    const prefix = this.getSelectedPrefix();

    if (!prefix) {
      return;
    }

    const isCustom = 'fak' === prefix || 'fakd' === prefix;

    if (!isCustom && !this.showcaseIconsByPrefix.hasOwnProperty(prefix)) {
      this.isLoadingShowcase = true;
      try {
        await this.fetchShowcaseForPrefix(prefix);
      } finally {
        // Only clear the loading flag if the user is still looking at this same
        // prefix. A fetch for a previously-selected prefix must not flip the flag
        // off while the current selection is still loading (would flash "no results").
        if (this.getSelectedPrefix() === prefix) {
          this.isLoadingShowcase = false;
        }
      }
    }

    this.setShowcaseIcons();
  }

  // Fetch (at most once) the showcase for a single prefix, de-duplicating concurrent
  // callers: a request already in flight for the prefix is shared rather than re-issued.
  fetchShowcaseForPrefix(prefix: string): Promise<void> {
    if (this.showcaseIconsByPrefix.hasOwnProperty(prefix)) {
      return Promise.resolve();
    }

    if (!this.showcaseFetchesByPrefix[prefix]) {
      const variables = { token: this.kitToken, selector: { prefix } };
      const cacheKey = computeCacheKey(SHOWCASE_ICONS_QUERY, variables, this.kitMetadata?.kitRevision, this.showcaseCacheKey);

      this.showcaseFetchesByPrefix[prefix] = this.handleQuery(SHOWCASE_ICONS_QUERY, variables, { cache: true, cacheKey })
        .then(response => {
          this.showcaseIconsByPrefix = {
            ...this.showcaseIconsByPrefix,
            [prefix]: showcaseIconsToIconLookups(response),
          };
        })
        .finally(() => {
          delete this.showcaseFetchesByPrefix[prefix];
        });
    }

    return this.showcaseFetchesByPrefix[prefix];
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
      // Drop any search still pending from prior keystrokes so its results can't land
      // (and overwrite the showcase/default view) after the box has been cleared.
      this.updateQueryResultsWithDebounce.cancel();
      if (this.kitToken) {
        // Kit mode: return to the kit's curated showcase for the selected family-style.
        this.fetchShowcaseForSelectedFamilyStyle().catch(err => console.error(err));
      } else {
        this.setIcons(this.defaultIcons, this.iconUploadsAsIconUploadLookups());
      }
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

  shouldEmitSvgData(): boolean {
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

    return override || [...this.embedSvgPrefixes].length > 0;
  }

  emitIconChooserResult(iconDefinition: IconDefinition) {
    const { prefix, iconName } = iconDefinition;
    const iconLookup = { prefix, iconName };

    // default to the restrictive case
    let result = iconLookup;

    const embedAllowed = this.shouldEmitSvgData();

    if (embedAllowed) {
      result = iconDefinition;
    }

    const familyStyle = this.prefixToFamilyStyle[prefix];

    this.finish.emit(buildIconChooserResult(result, familyStyle));
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
              <fa-icon {...this.commonFaIconProps} stylePrefix="fas" familyStylePathSegment="solid" name="search" class="icons-search-decorative"></fa-icon>
              <input
                type="text"
                name="search"
                id="search"
                class="rounded"
                value={this.query}
                onInput={this.onSearchInputChange.bind(this)}
                placeholder={this.searchInputPlaceholder || slotDefaults()['search-field-placeholder']}
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
          {!this.isQuerying && !this.isLoadingShowcase && this.mayHaveIconUploads() && !this.hasIconUploads() && ['kit', 'kit-duotone'].includes(this.selectedFamily) && (
            <article class="text-center margin-2xl">
              <p class="muted size-sm">{this.slot('kit-has-no-uploaded-icons')}</p>
            </article>
          )}
          {!this.isQuerying && !this.isLoadingShowcase && this.query === '' && this.getFamilies().length > 0 && (
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
          ) : this.isLoadingShowcase ? (
            <article class="message-loading text-center margin-2xl">
              <h3>Loading...</h3>
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
                    <button class="icon subtle display-flex flex-column flex-items-center flex-content-center" onClick={() => this.emitIconChooserResult(iconDefinition)}>
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
