import defaultIconsSearchResult from './defaultIconsSearchResult.json'

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

export enum FaTechnology {
  KitSvg = 1,
  KitWebfont,
  CdnSvg,
  CdnWebfont,
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
