import { newE2EPage } from '@stencil/core/testing'

describe('fa-icon-chooser', () => {
  it('renders', async () => {
    const page = await newE2EPage()

    await page.setContent('<div id="container"></div>')

    const attrs = {
      version: '5.15.3',
      'cdn-url': 'https://example.com/all.js',
      pro: true
    }

    await page.$eval('#container', (elm: any, attrs) => {
      const ic = document.createElement('fa-icon-chooser')
      ic.handleQuery = () => Promise.resolve(
        {"data":{"search":[{"id":"business-time","label":"Business Time","membership":{"free":["solid"],"pro":["solid","regular","light","duotone"]}},{"id":"socks","label":"Socks","membership":{"free":["solid"],"pro":["solid","regular","light","duotone"]}},{"id":"print-slash","label":"Print Slash","membership":{"free":[],"pro":["solid","regular","light","duotone"]}},{"id":"print-search","label":"Print Search","membership":{"free":[],"pro":["solid","regular","light","duotone"]}},{"id":"print","label":"print","membership":{"free":["solid"],"pro":["solid","regular","light","duotone"]}},{"id":"fax","label":"Fax","membership":{"free":["solid"],"pro":["solid","regular","light","duotone"]}},{"id":"user-tie","label":"User Tie","membership":{"free":["solid"],"pro":["solid","regular","light","duotone"]}},{"id":"building","label":"Building","membership":{"free":["solid","regular"],"pro":["solid","regular","light","duotone"]}},{"id":"briefcase","label":"Briefcase","membership":{"free":["solid"],"pro":["solid","regular","light","duotone"]}}]}}
      )
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
