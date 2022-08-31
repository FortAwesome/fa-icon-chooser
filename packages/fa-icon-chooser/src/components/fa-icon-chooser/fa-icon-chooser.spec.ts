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

describe('fa-icon-chooser', () => {
  const handleQuery = jest.fn().mockReturnValueOnce(Promise.resolve());
  const handleResult = jest.fn();

  afterEach(() => {
    handleQuery.mockClear();
    handleResult.mockClear();
  });

  it('renders with initial free icons', async () => {
    const page = await newSpecPage({
      components: [FaIconChooser],
    });

    const getUrlText = jest.fn(url => {
      if (url.match(/all.js/)) {
        page.win['FontAwesome'] = {
          dom: {
            css: () => {
              return '/* fake css */';
            },
          },
        };
        return Promise.resolve(`// fake JavaScript`);
      } else {
        return Promise.reject('fake rejection');
      }
    });

    const el = document.createElement('fa-icon-chooser');
    el.handleQuery = handleQuery;
    el.getUrlText = getUrlText;
    el.addEventListener('finish', handleResult || jest.fn());
    el.setAttribute('version', '5.15.3');

    page.body.appendChild(el);
    await page.waitForChanges();

    // No initial query is necessary
    expect(handleQuery.mock.calls.length).toBe(0);
    // No result will have been emitted yet
    expect(handleResult.mock.calls.length).toBe(0);

    // One request for the all.js
    expect(getUrlText.mock.calls.length).toBe(1);
    expect(page.root.shadowRoot.innerHTML).toMatch('<div class="fa-icon-chooser">');

    // the style should have been injected into the shadow DOM
    const stylesInShadowDOM = await page.root.shadowRoot.querySelectorAll('style');
    let foundFaCss = false;
    stylesInShadowDOM.forEach(style => {
      if (style.innerText.match(/fake css/)) {
        foundFaCss = true;
      }
    });

    // the script should have been injected into the outer DOM's head
    const scriptsInHead = await page.doc.head.querySelectorAll('script');
    let foundFaScript = false;
    scriptsInHead.forEach(script => {
      if (script.innerText.match(/fake JavaScript/)) {
        foundFaScript = true;
      }
    });

    expect(foundFaScript).toBe(true);

    // The initial default icons should have be shown
    get(defaultIcons, 'data.search', [])
      .filter(i => i.familyStylesByLicense.free.length > 0)
      .forEach(({ id }) => {
        expect(page.root.shadowRoot.innerHTML).toEqual(expect.stringMatching(new RegExp(`<fa-icon .*name="${id}"`)));
      });

    const disabledStyleFilters = ['light', 'duotone', 'thin'];
    disabledStyleFilters.forEach(async style => {
      const input = await page.root.shadowRoot.querySelector(`input#icons-style-${style}`);
      expect(input['disabled']).toBe(true);
    });

    const enabledStyleFilters = ['solid', 'brands', 'regular'];
    enabledStyleFilters.forEach(async style => {
      const input = await page.root.shadowRoot.querySelector(`input#icons-style-${style}`);
      expect(input['disabled']).toBe(false);
    });

    const checkedStyleFilters = ['solid', 'brands'];
    checkedStyleFilters.forEach(async style => {
      const input = await page.root.shadowRoot.querySelector(`input#icons-style-${style}`);
      expect(input['checked']).toBe(true);
    });

    const uncheckedStyleFilters = ['regular'];
    uncheckedStyleFilters.forEach(async style => {
      const input = await page.root.shadowRoot.querySelector(`input#icons-style-${style}`);
      expect(input['checked']).toBe(false);
    });
  });
});
