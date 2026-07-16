import defaultIconsSearchResultTemplate from './defaultIconsSearchResult.json';
import { valid as validSemver } from 'semver';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import set from 'lodash/set';

// These default to Font Awesome production hosts. In a local dev environment they
// can be overridden via a gitignored .env.local file (see stencil.config.ts and
// .env.local.example). The `process.env.*` references are replaced at build time by
// @rollup/plugin-replace, so no `process` global is needed at runtime in the browser.
const FREE_CDN_URL = process.env.FA_FREE_CDN_URL || 'https://use.fontawesome.com';
const PRO_KIT_ASSET_URL = process.env.FA_PRO_KIT_ASSET_URL || 'https://ka-p.fontawesome.com';
const FREE_KIT_ASSET_URL = process.env.FA_FREE_KIT_ASSET_URL || 'https://ka-f.fontawesome.com';

export type UrlTextFetcher = (url: string) => Promise<string>;

// Given a set of familyStyles, replace the term "ALL" in the defaultIconsSearchResult
// asset. This is to allow that static query result to dynamically include
// new familyStyles, as they are released and made available via the GraphQL API.
// It rests on the assumption that each (non-brands) icon in that static default query is
// available in all Pro familyStyles.
export function buildDefaultIconsSearchResult(familyStyles: object): object {
  const allNonBrandsFamilyStyles = [];

  for (const family in familyStyles) {
    for (const style in familyStyles[family]) {
      if ('brands' !== style && 'brands' !== family && 'custom' !== style) {
        allNonBrandsFamilyStyles.push({ family, style });
      }
    }
  }

  const defaultIconsSearchResult = cloneDeep(defaultIconsSearchResultTemplate);

  const icons = get(defaultIconsSearchResult, 'data.search', []);

  for (const i of icons) {
    if ('ALL' === get(i, 'familyStylesByLicense.pro')) {
      set(i, 'familyStylesByLicense.pro', allNonBrandsFamilyStyles);
    }
  }

  return defaultIconsSearchResult;
}

export interface FamilyStyle {
  family: string;
  style: string;
  prefix: string;
}

export interface IconLookup {
  prefix: string;
  iconName: string;
}

export interface IconLookupWithFamilyStyle extends IconLookup {
  family: string;
  style: string;
}

export type IconUpload = {
  name: string;
  unicode: number;
  version: number;
  width: string;
  height: string;
  pathData: string;
};

export interface IconUploadLookup extends IconLookup {
  iconUpload: IconUpload;
}

export interface IconDefinition extends IconLookup {
  icon: Array<any>;
}

export interface IconDefinitionWithFamilyStyle extends IconLookupWithFamilyStyle {
  icon: Array<any>;
}

export type IconChooserResult = IconLookupWithFamilyStyle | IconDefinitionWithFamilyStyle;

// Shapes returned by the kit-subset-aware GraphQL fields Kit.searchKit and
// Kit.showcaseIcons. See specs/001-kit-subset-search/contracts/.

// A single concrete family-style of an icon (the element of IconWithVariants.variants
// and the element of Kit.showcaseIcons.iconVariants).
export interface IconVariant {
  name: string;
  unicodeHex?: string;
  familyStyle: FamilyStyle;
}

// Kit.searchKit returns SearchKitResult, whose `icons` is a SearchKitIcon union of
// IconWithVariants (OFFICIAL results) and IconUpload (CUSTOM results). Verified live
// 2026-06-26: the list field is `icons` (not `iconVariants`) and the count is
// `totalIconCount` (not `totalIconVariantCount`).
export interface IconWithVariants {
  __typename?: 'IconWithVariants';
  name: string;
  label?: string;
  unicodeHex?: string;
  variants: Array<IconVariant>;
}

export interface SearchKitIconUpload {
  __typename?: 'IconUpload';
  name: string;
  unicodeHex?: string;
  width?: string;
  height?: string;
  pathData?: Array<string>;
}

export type SearchKitIcon = IconWithVariants | SearchKitIconUpload;

export interface SearchKitResult {
  icons: Array<SearchKitIcon>;
  page: number;
  pageSize: number;
  totalIconCount: number;
  totalPageCount: number;
}

// Return shape of Kit.showcaseIcons (a paginated list of official icon variants).
export interface IconVariantsPaginated {
  iconVariants: Array<IconVariant>;
  page: number;
  pageSize: number;
  totalIconVariantCount: number;
  totalPageCount: number;
}

// Input for Kit.showcaseIcons' `selector` arg (a @oneOf input: supply exactly one member).
export interface FamilyStyleSelector {
  pair?: { family: string; style: string };
  shorthand?: string;
  prefix?: string;
}

const viewBoxRe = /viewBox="0 0 ([0-9]+) ([0-9]+)"/;
const singlePathRe = /path d="([^"]+)"/;
const duotonePathRe = [
  /path d="(?<d1>[^"]+)".*path d="(?<d2>[^"]+)"/,
  /path class="(?<cls1>[^"]+)".*d="(?<d1>[^"]+)".*path class="(?<cls2>[^"]+)".*d="(?<d2>[^"]+)"/,
  /path class="(?<cls1>[^"]+)".*d="(?<d1>[^"]+)"/,
];

export const CONSOLE_MESSAGE_PREFIX = 'Font Awesome Icon Chooser';

export function parseSvgText(svgText) {
  let val = null;
  let path = null;
  const viewBox = svgText.match(viewBoxRe);
  const singlePath = svgText.match(singlePathRe);
  const duotonePath = svgText.match(duotonePathRe[0]) || svgText.match(duotonePathRe[1]) || svgText.match(duotonePathRe[2]);

  if (duotonePath) {
    const { cls1, d1, cls2, d2 } = duotonePath.groups;

    if (d1 && d2 && !cls1 && !cls2) {
      path = [d1, d2];
    } else if (d1 && cls1 && !d2) {
      path = cls1.indexOf('primary') > -1 ? ['', d1] : [d1, ''];
    } else if (d1 && d2 && cls1 && cls2) {
      path = cls1.indexOf('primary') > -1 ? [d2, d1] : [d1, d2];
    }
  } else if (singlePath && singlePath.length === 2) {
    path = singlePath[1];
  }

  if (viewBox && path) {
    val = [parseInt(viewBox[1], 10), parseInt(viewBox[2], 10), [], null, path];
  }

  return val;
}

export function freeCdnBaseUrl(): string {
  return FREE_CDN_URL;
}

export function kitAssetsBaseUrl(pro: boolean): string {
  return pro ? PRO_KIT_ASSET_URL : FREE_KIT_ASSET_URL;
}

export async function createFontAwesomeScriptElement(
  getUrlText: UrlTextFetcher,
  pro: boolean,
  version: string,
  baseUrl: string,
  kitToken: string | undefined,
): Promise<HTMLElement> {
  const license = pro ? 'pro' : 'free';
  const assetUrl = kitToken ? `${baseUrl}/releases/v${version}/js/${license}.min.js?token=${kitToken}` : `${baseUrl}/releases/v${version}/js/all.js`;

  try {
    if ('function' !== typeof getUrlText) {
      throw new Error("Font Awesome Icon Chooser: expected getUrlText to be a function but it wasn't");
    }

    const scriptContent = await getUrlText(assetUrl);
    const script = document.createElement('SCRIPT');
    const text = document.createTextNode(scriptContent);
    script.appendChild(text);
    script.setAttribute('data-auto-replace-svg', 'false');
    script.setAttribute('data-auto-add-css', 'false');
    script.setAttribute('type', 'text/javascript');

    return script;
  } catch (e) {
    console.error(e);
    throw new Error(e);
  }
}

export function buildIconChooserResult(value: IconDefinition | IconLookup, familyStyle: FamilyStyle): IconChooserResult {
  return { ...value, family: familyStyle.family, style: familyStyle.style };
}

export function isValidSemver(val: string): boolean {
  return !!validSemver(val);
}

// In kit mode, the search mode is CUSTOM for a kit's custom-upload family-styles
// (fak/fakd) and OFFICIAL for every other family-style.
export function searchModeForPrefix(prefix: string): 'OFFICIAL' | 'CUSTOM' {
  return prefix === 'fak' || prefix === 'fakd' ? 'CUSTOM' : 'OFFICIAL';
}

// Map an array of IconVariant ({ name, familyStyle.prefix, ... }) into the
// component's internal { iconName, prefix } model. Each variant carrying both a name
// and a family-style prefix becomes one lookup.
function variantsToIconLookups(variants: any): Array<IconLookup> {
  if (!Array.isArray(variants)) {
    return [];
  }

  return variants.reduce((acc: Array<IconLookup>, variant: any) => {
    const iconName = get(variant, 'name');
    const prefix = get(variant, 'familyStyle.prefix');

    if (iconName && prefix) {
      acc.push({ iconName, prefix });
    }

    return acc;
  }, []);
}

// Adapt a Kit.searchKit response into the component's internal { iconName, prefix }
// model. `searchKit.icons` is a SearchKitIcon union: an IconWithVariants (OFFICIAL)
// contributes one lookup per concrete `variant`; an IconUpload (CUSTOM) has no
// family-style, so it contributes one lookup by name (prefix undefined — the caller
// resolves custom matches to the kit's uploaded icons for rendering). A legitimately
// empty result maps to [].
export function searchKitIconsToIconLookups(response: any): Array<IconLookup> {
  const icons = get(response, 'data.me.kit.searchKit.icons', []);

  if (!Array.isArray(icons)) {
    return [];
  }

  return icons.reduce((acc: Array<IconLookup>, icon: any) => {
    const iconName = get(icon, 'name');

    if (!iconName) {
      return acc;
    }

    const variants = get(icon, 'variants');

    if (Array.isArray(variants)) {
      // IconWithVariants (OFFICIAL): one lookup per concrete family-style.
      for (const variant of variants) {
        const prefix = get(variant, 'familyStyle.prefix');
        if (prefix) {
          acc.push({ iconName, prefix });
        }
      }
    } else {
      // IconUpload (CUSTOM): only the name is known here.
      acc.push({ iconName, prefix: undefined });
    }

    return acc;
  }, []);
}

// Adapt a Kit.showcaseIcons response (a paginated list of official icon variants)
// into the component's internal { iconName, prefix } model. Empty result maps to [].
export function showcaseIconsToIconLookups(response: any): Array<IconLookup> {
  return variantsToIconLookups(get(response, 'data.me.kit.showcaseIcons.iconVariants', []));
}

// Read Kit.showcaseCacheKey from a kit-metadata response, or undefined if absent.
// This single, kit-provided value is the showcase cache identity (FR-009/FR-010).
export function showcaseCacheKeyFromResponse(response: any): string | undefined {
  const cacheKey = get(response, 'data.me.kit.showcaseCacheKey');
  return typeof cacheKey === 'string' ? cacheKey : undefined;
}

// Read Kit.kitRevision from a kit response, or undefined if absent. The revision
// changes whenever the kit changes, so it is folded into the kit-metadata and
// showcase cache keys to bust stale cached data.
export function kitRevisionFromResponse(response: any): string | number | undefined {
  const kitRevision = get(response, 'data.me.kit.kitRevision');
  return typeof kitRevision === 'string' || typeof kitRevision === 'number' ? kitRevision : undefined;
}

// Serialize a value deterministically so the derived cache key is stable
// regardless of object property insertion order.
function stableSerialize(value: unknown): string {
  if (value === undefined) {
    return 'undefined';
  }
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }
  const keys = Object.keys(value as object).sort();
  return `{${keys.map(key => `${JSON.stringify(key)}:${stableSerialize((value as any)[key])}`).join(',')}}`;
}

// cyrb53: a small, fast, non-cryptographic 53-bit string hash with low collision
// rates. Used only to derive a compact, deterministic cache-key identity from its
// inputs — not for any security purpose.
function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hashed = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return hashed.toString(16);
}

// Derive a deterministic cache key by hashing the given parts together. Each part
// is serialized deterministically (sorted object keys) and combined, so the
// resulting key is fully self-contained: the handleQuery implementor can use it
// alone as the cache key, without re-deriving identity from the query or variables.
export function computeCacheKey(...parts: Array<unknown>): string {
  // Use \x00 for NUL
  return cyrb53(parts.map(stableSerialize).join('\x00'));
}

// Read the kit's subset family-styles from Kit.familyStylesPaginated on a kit-metadata
// response. The first page's nodes are FamilyStyleSubset, whose `familyStyle` is a
// FamilyStyle carrying `family`, `style`, and `prefix` — the authoritative subset list,
// and the only source of the family-styles the chooser offers in kit mode. Nodes missing
// any of the three are skipped rather than yielding a partial family-style.
export function kitFamilyStylesFromResponse(response: any): Array<FamilyStyle> {
  const familyStyles = get(response, 'data.me.kit.familyStylesPaginated.familyStyles', []);

  if (!Array.isArray(familyStyles)) {
    return [];
  }

  return familyStyles
    .map((fs: any) => get(fs, 'familyStyle'))
    .filter((fs: any): fs is FamilyStyle => !!fs && typeof fs.family === 'string' && typeof fs.style === 'string' && typeof fs.prefix === 'string')
    .map((fs: FamilyStyle) => ({ family: fs.family, style: fs.style, prefix: fs.prefix }));
}

// Truncate a kit name for display in kit-mode copy. A name of `max` (default 30)
// characters or fewer is returned unchanged; a longer name is truncated to its first
// `max` characters followed by an ellipsis (the ellipsis is a display affordance and
// is not counted toward `max`). A missing/empty name yields an empty string, so copy
// still renders. (FR-017/SC-011)
export function truncateKitName(name?: string, max = 30): string {
  if (!name) {
    return '';
  }

  return name.length > max ? `${name.slice(0, max)}…` : name;
}

export const Fragment = (_props, children) => [...children];
