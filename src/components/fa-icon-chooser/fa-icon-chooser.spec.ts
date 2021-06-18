import { newSpecPage } from '@stencil/core/testing';
import { FaIconChooser } from './fa-icon-chooser';

// TODO: tests
// - remove contents from query field after having had some contents: what should happen in that state?
// - when pro is not enabled, style filter buttons should not be display for Light or Duotone
// - duotone style filter button is only shown for Pro >= 5.10.0

async function mountWith(params) {
  const { attrs, handleQuery, handleResult } = params

  const page = await newSpecPage({
    components: [FaIconChooser],
    html: '<div id="container"></div>',
  })

  const container = page.doc.querySelector('#container')

  const el = document.createElement('fa-icon-chooser')
  el.handleQuery = handleQuery || jest.fn()
  el.addEventListener('finish', handleResult || jest.fn())

  for (const attr in attrs) {
    el.setAttribute(attr, attrs[attr])
  }

  container.appendChild(el)
  await page.waitForChanges()

  return page
}

describe('fa-icon-chooser', () => {
  it('renders', async () => {
    const page = await mountWith({ attrs: {version: '5.15.3'}})
    expect(page.root.innerHTML).toMatch("<h2>Sorry, we couldn't find anything for that...</h2>")
  })
})
