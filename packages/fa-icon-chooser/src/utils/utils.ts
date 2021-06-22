function setCrossOrigin(el: HTMLElement) {
  el.setAttribute('crossorigin', 'anonymous')
}

function maybeSetIntegrity(el: HTMLElement, integrity?: string) {
  if(integrity) {
    el.setAttribute('integrity', integrity)
  }
}

export function setupCdnSvg(document: HTMLDocument, shadow: ShadowRoot, url: string, integrity?: string) {
  const el = document.createElement('script')
  setCrossOrigin(el)
  el.setAttribute('src', url)
  maybeSetIntegrity(el, integrity)
  shadow.appendChild(el)
}

export function setupCdnWebfont(document: HTMLDocument, shadow: ShadowRoot, url: string, integrity?: string) {
  const el = document.createElement('link')
  el.setAttribute('rel', 'stylesheet')
  el.setAttribute('href', url)
  setCrossOrigin(el)
  maybeSetIntegrity(el, integrity)
  shadow.appendChild(el)
}

export function setupKit(document: HTMLDocument, shadow: ShadowRoot, kitToken: string) {
  const el = document.createElement('script')
  setCrossOrigin(el)
  el.setAttribute('src', `https://kit.fontawesome.com/${kitToken}.js`)
  shadow.appendChild(el)
  fakeSetupKit(document, shadow)
}

function fakeSetupKit(document: HTMLDocument, shadow: ShadowRoot) {
  const el = document.createElement('script')
  el.setAttribute('src', `/dev/fakeKit.js`)
  shadow.appendChild(el)
}
