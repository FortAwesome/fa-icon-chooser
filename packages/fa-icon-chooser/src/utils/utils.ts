import defaultIconsSearchResult from './defaultIconsSearchResult.json';
import { IconLookup } from '@fortawesome/fontawesome-common-types';
import { valid as validSemver } from 'semver';

export type UrlTextFetcher = (url: string) => Promise<string>;

export const defaultIcons: any = defaultIconsSearchResult;

// The IconPrefix type in @fortawesome/fontawesome-common-types corresponding to
// FA v5 does not include 'fat', nor 'fak', so we'll make our own type here temporarily.
export type IconPrefix = 'fas' | 'fab' | 'far' | 'fal' | 'fat' | 'fad' | 'fak';

export type IconStyle = 'solid' | 'duotone' | 'regular' | 'light' | 'thin' | 'kit' | 'brands';

export type IconStyleToPrefix = {
  [style in IconStyle]: string;
};

export type IconPrefixToStyle = {
  [prefix in IconPrefix]: IconStyle;
};

export const STYLE_TO_PREFIX: IconStyleToPrefix = {
  solid: 'fas',
  duotone: 'fad',
  regular: 'far',
  light: 'fal',
  thin: 'fat',
  kit: 'fak',
  brands: 'fab',
};

export const PREFIX_TO_STYLE: IconPrefixToStyle = {
  fas: 'solid',
  fad: 'duotone',
  far: 'regular',
  fal: 'light',
  fat: 'thin',
  fak: 'kit',
  fab: 'brands',
};

export type IconUpload = {
  name: string;
  unicode: number;
  version: number;
  width: string;
  height: string;
  path: string;
};

export interface IconUploadLookup extends IconLookup {
  iconUpload: IconUpload;
}

export type IconChooserResult = IconLookup;

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
  return 'https://use.fontawesome.com';
}

export function kitAssetsBaseUrl(pro: boolean): string {
  return pro ? 'https://ka-p.fontawesome.com' : 'https://ka-f.fontawesome.com';
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
    if ('function' !== typeof getUrlText) throw new Error("Font Awesome Icon Chooser: expected getUrlText to be a function but it wasn't");

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

export function buildIconChooserResult(iconLookup: IconLookup | IconUploadLookup): IconChooserResult {
  const { prefix, iconName } = iconLookup;

  return { prefix, iconName };
}

export function isValidSemver(val: string): boolean {
  return !!validSemver(val);
}

export const Fragment = (_props, children) => [...children];
