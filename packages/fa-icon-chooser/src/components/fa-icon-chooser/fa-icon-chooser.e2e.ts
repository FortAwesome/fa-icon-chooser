import { newE2EPage } from '@stencil/core/testing'

// TODO: add test matrix to ensure that icons and styles are being applied,
// producing the expected rendering for:
// - Kit with SVG/JS
// - Kit with Webfont/CSS
// - CDN Webfont/CSS
// - CDN SVG/JS

describe('fa-icon-chooser', () => {
  it('renders', async () => {
    const page = await newE2EPage()

    await page.setContent('<div id="container"></div>')

    const attrs = {
      version: '5.15.3'
    }

    await page.$eval('#container', (elm: any, attrs) => {
      const ic = document.createElement('fa-icon-chooser')
      ic.handleQuery = () => Promise.resolve()
      ic.addEventListener('finish', () => {})
      for (const attr in attrs) {
        ic.setAttribute(attr, attrs[attr])
      }
      elm.appendChild(ic)
    }, attrs)

    await page.waitForChanges()

    const element = await page.find('fa-icon-chooser')

    expect(element).toHaveClass('hydrated')
  })
})
