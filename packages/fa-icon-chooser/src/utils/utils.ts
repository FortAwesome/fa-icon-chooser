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
