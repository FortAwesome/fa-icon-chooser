import { newSpecPage } from '@stencil/core/testing';
import { FaIconChooser } from './fa-icon-chooser';

// TODO: tests
// - remove contents from query field after having had some contents: what should happen in that state?
// - when pro is not enabled, style filter buttons should not be display for Light or Duotone
// - duotone style filter button is only shown for Pro >= 5.10.0

async function mountWith(params) {
  const { attrs, handleQuery, handleResult } = params

  const page = await newSpecPage({
    components: [FaIconChooser]
  })

  const el = document.createElement('fa-icon-chooser')
  el.handleQuery = handleQuery || jest.fn()
  el.addEventListener('finish', handleResult || jest.fn())

  for (const attr in attrs) {
    el.setAttribute(attr, attrs[attr])
  }

  page.body.appendChild(el)
  await page.waitForChanges()

  return page
}

describe('fa-icon-chooser', () => {
  const handleQuery = jest.fn().mockReturnValueOnce(Promise.resolve(
    {"data":{"search":[{"id":"business-time","label":"Business Time","membership":{"free":["solid"],"pro":["solid","regular","light","duotone"]}},{"id":"socks","label":"Socks","membership":{"free":["solid"],"pro":["solid","regular","light","duotone"]}},{"id":"print-slash","label":"Print Slash","membership":{"free":[],"pro":["solid","regular","light","duotone"]}},{"id":"print-search","label":"Print Search","membership":{"free":[],"pro":["solid","regular","light","duotone"]}},{"id":"print","label":"print","membership":{"free":["solid"],"pro":["solid","regular","light","duotone"]}},{"id":"fax","label":"Fax","membership":{"free":["solid"],"pro":["solid","regular","light","duotone"]}},{"id":"user-tie","label":"User Tie","membership":{"free":["solid"],"pro":["solid","regular","light","duotone"]}},{"id":"building","label":"Building","membership":{"free":["solid","regular"],"pro":["solid","regular","light","duotone"]}},{"id":"briefcase","label":"Briefcase","membership":{"free":["solid"],"pro":["solid","regular","light","duotone"]}}]}}
  ))

  it('renders with initial icons', async () => {
    const page = await mountWith({ handleQuery, attrs: { version: '5.15.3', 'cdn-url': 'https://example.com/all.js', pro: true } })
    expect(handleQuery.mock.calls.length).toBe(1)
    expect(page.root.shadowRoot.innerHTML).toMatch('<div class="fa-icon-chooser">')
    expect(page.root.shadowRoot.innerHTML).toMatch('fa-business-time')
    expect(page.root.shadowRoot.innerHTML).toMatch('fa-socks')
  })
})
