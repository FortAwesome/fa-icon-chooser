import defaultIconsSearchResult from './defaultIconsSearchResult.json'
import { IconLookup } from '@fortawesome/fontawesome-common-types'

export const defaultIcons: any = defaultIconsSearchResult

// TODO: figure out whether the IconPrefix type in @fortawesome/fontawesome-common-types
// should have 'fat' in it.
// But this also needs to include "fak" for icon uploads. Does that even belong in the IconPrefix type?
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

export function assetsBaseUrl(pro: boolean): string {
  return pro
    ? 'https://ka-p.fontawesome.com'
    : 'https://ka-f.fontawesome.com'
}

export async function createFontAwesomeScriptElement(pro: boolean, version: string, baseUrl: string, kitToken: string): Promise<HTMLElement> {
    const license = pro ? 'pro' : 'free'
    const assetUrl = `${baseUrl}/releases/v${version}/js/${license}.min.js?token=${kitToken}`

    try {
      const response = await fetch(assetUrl)

      if (!response.ok) {
        throw new Error('Font Awesome Icon Chooser: unexpected response from CDN')
      }

      const scriptContent = await response.text()
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

export function buildIconChooserResult(icon: IconLookup) {
  const { prefix, iconName} = icon

  return { prefix, iconName }
}
