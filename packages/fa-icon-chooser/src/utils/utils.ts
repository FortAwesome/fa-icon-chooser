import defaultIconsSearchResultTemplate from './defaultIconsSearchResult.json';
import { valid as validSemver } from 'semver';
import { cloneDeep, get, set } from 'lodash';

const FREE_CDN_URL = 'https://use.fontawesome.com';
const PRO_KIT_ASSET_URL = 'https://ka-p-epic.fontawesome.com';
const FREE_KIT_ASSET_URL = 'https://ka-f-epic.fontawesome.com';

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

export interface IconLookup {
  prefix: string;
  iconName: string;
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

export type IconChooserResult = IconLookup | IconDefinition;

const viewBoxRe = /viewBox="0 0 ([0-9]+) ([0-9]+)"/;
const singlePathRe = /path d="([^"]+)"/;
const duotonePathRe = [
  /path d="(?<d1>[^"]+)".*path d="(?<d2>[^"]+)"/,
  /path class="(?<cls1>[^"]+)".*d="(?<d1>[^"]+)".*path class="(?<cls2>[^"]+)".*d="(?<d2>[^"]+)"/,
  /path class="(?<cls1>[^"]+)".*d="(?<d1>[^"]+)"/,
];

export const CONSOLE_MESSAGE_PREFIX = 'Font Awesome Icon Chooser';

export function parseSvgText(svgText) {
  if (!svgText) {
    console.error(`${CONSOLE_MESSAGE_PREFIX}: Empty SVG text received`);
    throw new Error('Empty SVG text');
  }

  // try to parse json
  try {
    const jsonData = JSON.parse(svgText);

    if (jsonData && Array.isArray(jsonData.icon) && jsonData.icon.length >= 5) {
      return jsonData.icon;
    }
  } catch (e) {
    console.error('Not a JSON response', e);
  }

  let val = null;
  let path = null;

  // Clean up any whitespace and normalize quotes
  const cleanSvg = svgText.replace(/\s+/g, ' ').trim();

  const viewBox = cleanSvg.match(viewBoxRe);

  if (!viewBox) {
    console.error(`${CONSOLE_MESSAGE_PREFIX}: Invalid SVG format - missing viewBox. SVG text:`, cleanSvg);
    throw new Error('Invalid SVG format - missing viewBox');
  }

  // Parse the viewBox values
  const [viewBoxValues] = viewBox;

  const [_x, _y, width, height] = viewBoxValues.split(/[\s,]+/).map(Number);

  if (isNaN(width) || isNaN(height)) {
    console.error(`${CONSOLE_MESSAGE_PREFIX}: Invalid viewBox dimensions:`, { width, height });
    throw new Error('Invalid viewBox dimensions');
  }

  // try to match duotone paths
  const duotonePath = cleanSvg.match(duotonePathRe[0]) || cleanSvg.match(duotonePathRe[1]) || cleanSvg.match(duotonePathRe[2]);
  if (duotonePath) {
    const { cls1, d1, cls2, d2 } = duotonePath.groups || {};

    if (d1 && d2 && !cls1 && !cls2) {
      path = [d1, d2];
    } else if (d1 && cls1 && !d2) {
      path = cls1.indexOf('primary') > -1 ? ['', d1] : [d1, ''];
    } else if (d1 && d2 && cls1 && cls2) {
      path = cls1.indexOf('primary') > -1 ? [d2, d1] : [d1, d2];
    }
  } else {
    // Try to match single path
    const singlePath = cleanSvg.match(singlePathRe);

    if (singlePath && singlePath.length === 2) {
      path = singlePath[1];
    }
  }

  if (!path) {
    console.error(`${CONSOLE_MESSAGE_PREFIX}: Invalid SVG format - no path data found. SVG text:`, cleanSvg);
    throw new Error('Invalid SVG format - no path data found');
  }

  // Create the icon array format that FontAwesome expects
  val = [width, height, [], null, path];

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

export function buildIconChooserResult(value: IconDefinition | IconLookup): IconChooserResult {
  return value;
}

export function isValidSemver(val: string): boolean {
  return !!validSemver(val);
}

export const Fragment = (_props, children) => [...children];
