import defaultIconsSearchResult from './defaultIconsSearchResult.json'
import { IconLookup } from '@fortawesome/fontawesome-common-types'

export type UrlTextFetcher = (url: string) => Promise<string>

export const defaultIcons: any = defaultIconsSearchResult

// The IconPrefix type in @fortawesome/fontawesome-common-types corresponding to
// FA v5 does not include 'fat', nor 'fak', so we'll make our own type here temporarily.
export type IconPrefix = 'fas' | 'fab' | 'far' | 'fal' | 'fat' | 'fad' | 'fak'

export type IconStyle = 'solid' | 'duotone' | 'regular' | 'light' | 'thin' | 'kit' | 'brands'

export type IconStyleToPrefix = {
  [style in IconStyle]: string
}

export type IconPrefixToStyle = {
  [prefix in IconPrefix]: IconStyle
}

export const STYLE_TO_PREFIX: IconStyleToPrefix = {
  solid: 'fas',
  duotone: 'fad',
  regular: 'far',
  light: 'fal',
  thin: 'fat',
  kit: 'fak',
  brands: 'fab'
}

export const PREFIX_TO_STYLE: IconPrefixToStyle = {
  fas: 'solid',
  fad: 'duotone',
  far: 'regular',
  fal: 'light',
  fat: 'thin',
  fak: 'kit',
  fab: 'brands'
}

export type IconUpload = {
  name: string;
  unicode: number;
  version: number;
  width: string;
  height: string;
  path: string;
}

export interface IconUploadLookup extends IconLookup {
  iconUpload: IconUpload
}

export interface Customizable {
  class?: string;
  style?: string;
  transform?: string;
}

export interface Element extends Customizable {
  tag: string;
  children?: Array<Element | Icon | string>
}

export interface Icon extends IconLookup, Customizable {
  mask?: IconLookup;
}

export type IconChooserResult = Icon | Element;

// TODO: replace this placeholder logic with, probably, real API calls
// that handle resolving the version.
export function resolveVersion(version: string): string {
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

// TODO: do we want to include this code in this project?
const viewBoxRe = /viewBox="0 0 ([0-9]+) ([0-9]+)"/
const singlePathRe = /path d="([^"]+)"/

const duotonePathDuoClasslessRe = /path d="([^"]+)".*path d="([^"]+)"/
const duotonePathDuoClassedRe = /path class="([^"]+)".*d="([^"]+)".*path class="([^"]+)".*d="([^"]+)"/
const duotonePathOnlyPrimaryRe = /path class="(fa-primary)".*d="([^"]+)"/
const duotonePathOnlySecondaryRe = /path class="(fa-secondary)".*d="([^"]+)"/

export const CONSOLE_MESSAGE_PREFIX = 'Font Awesome Icon Chooser'

export function parseSvgText(svgText) {
  let val = null
  let path = null
  const viewBox = svgText.match(viewBoxRe)
  const singlePath = svgText.match(singlePathRe)
  const duotonePath =
    svgText.match(duotonePathDuoClasslessRe)
    || svgText.match(duotonePathDuoClassedRe)
    || svgText.match(duotonePathOnlyPrimaryRe)
    || svgText.match(duotonePathOnlySecondaryRe)

  if (duotonePath && duotonePath.length === 3) {
    if(duotonePath[1].indexOf('primary') > -1) {
      path = [duotonePath[2], '']
    } else if (duotonePath[1].indexOf('secondary') > -1) {
      path = ['', duotonePath[2]]
    } else {
      path = [duotonePath[1], duotonePath[2]]
    }
  } else if (duotonePath && duotonePath.length === 5) {
    path = (duotonePath[1].indexOf('primary') > -1)
      ? [duotonePath[2], duotonePath[4]]
      : [duotonePath[4], duotonePath[2]]
  } else if (singlePath) {
    path = singlePath[1]
  }

  if (viewBox && path) {
    val = [
      parseInt(viewBox[1], 10),
      parseInt(viewBox[2], 10),
      [],
      null,
      path
    ]
  }

  return val
}

export function freeCdnBaseUrl(): string {
  return 'https://use.fontawesome.com'
}

export function kitAssetsBaseUrl(pro: boolean): string {
  return pro
    ? 'https://ka-p.fontawesome.com'
    : 'https://ka-f.fontawesome.com'
}

export async function createFontAwesomeScriptElement(getUrlText: UrlTextFetcher, pro: boolean, version: string, baseUrl: string, kitToken: string | undefined): Promise<HTMLElement> {
    const license = pro ? 'pro' : 'free'
    const assetUrl = kitToken
      ? `${baseUrl}/releases/v${version}/js/${license}.min.js?token=${kitToken}`
      : `${baseUrl}/releases/v${version}/js/all.js`

    try {
      if('function' !== typeof getUrlText) throw new Error('Font Awesome Icon Chooser: expected getUrlText to be a function but it wasn\'t')

      const scriptContent = await getUrlText(assetUrl)
      const script = document.createElement('SCRIPT')
      const text = document.createTextNode(scriptContent)
      script.appendChild(text)
      script.setAttribute('data-auto-replace-svg', 'false')
      script.setAttribute('data-auto-add-css', 'false')
      script.setAttribute('type', 'text/javascript')

      return script
    }
    catch(e) {
      console.error(e)
      throw new Error(e)
    }
}

export function buildIconChooserResult(iconLookup: IconLookup | IconUploadLookup): IconChooserResult {
  const { prefix, iconName} = iconLookup

  return { prefix, iconName }
}
