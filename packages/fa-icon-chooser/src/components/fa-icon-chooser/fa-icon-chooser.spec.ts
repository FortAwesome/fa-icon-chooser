import { newSpecPage } from '@stencil/core/testing';
import { FaIconChooser } from './fa-icon-chooser';
import { defaultIcons } from '../../utils/utils';
import { get } from 'lodash';

// TODO: tests
// - remove contents from query field after having had some contents: return to default state
// - when pro is not enabled, style filter buttons should be disabled
// - duotone style filter button is only enabled for Pro >= 5.10.0
// - test the full matrix of scenarios involving:
//   - whether FA SVG/JS is set up already in the outer DOM vs. being introduced by the web component

async function mountWith(params) {
  const { attrs, handleQuery, handleResult } = params;

  const page = await newSpecPage({
    components: [FaIconChooser],
  });

  const el = document.createElement('fa-icon-chooser');
  el.handleQuery = handleQuery || jest.fn();
  el.addEventListener('finish', handleResult || jest.fn());

  for (const attr in attrs) {
    el.setAttribute(attr, attrs[attr]);
  }

  page.body.appendChild(el);
  await page.waitForChanges();

  return page;
}

describe('fa-icon-chooser', () => {
  const handleQuery = jest.fn().mockReturnValueOnce(Promise.resolve());

  it('renders with initial icons', async () => {
    const page = await mountWith({ handleQuery, attrs: { 'version': '5.15.3', 'cdn-url': 'https://example.com/all.js', 'pro': true } });
    // No initial query is necessary
    expect(handleQuery.mock.calls.length).toBe(0);
    expect(page.root.shadowRoot.innerHTML).toMatch('<div class="fa-icon-chooser">');

    get(defaultIcons, 'data.search', []).forEach(({ id }) => {
      expect(page.root.shadowRoot.innerHTML).toMatch(`fa-${id}`);
    });
  });
});
