import { newSpecPage } from '@stencil/core/testing';
import { FaIconChooser } from './fa-icon-chooser';
import { buildDefaultIconsSearchResult } from '../../utils/utils';
import { get } from 'lodash';
import foodSearchResults from './food-search-results.fixture.json';

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

    expect(foundFaCss).toBe(true);

    // the script should have been injected into the outer DOM's head
    const scriptsInHead = await page.doc.head.querySelectorAll('script');
    let foundFaScript = false;
    scriptsInHead.forEach(script => {
      if (script.innerText.match(/fake JavaScript/)) {
        foundFaScript = true;
      }
    });

    expect(foundFaScript).toBe(true);

    const defaultIcons = buildDefaultIconsSearchResult({
      classic: {
        solid: {
          prefix: 'fas',
        },
        regular: {
          prefix: 'far',
        },
        brands: {
          prefix: 'fab',
        },
      },
    });

    // The initial default icons should have be shown
    get(defaultIcons, 'data.search', [])
      .filter(i => i.familyStylesByLicense.free.length > 0)
      .forEach(({ id, familyStylesByLicense }) => {
        const isNonBrandIcon = familyStylesByLicense.free.some(({ family, style }) => 'brands' !== family && 'brands' !== style);
        if (isNonBrandIcon) {
          expect(page.root.shadowRoot.innerHTML).toEqual(expect.stringMatching(new RegExp(`<fa-icon .*name="${id}"`)));
        }
      });
  });

  it('renders icons matching the includeFamilyStyle filter when only "far" is allowed', async () => {
    const page = await newSpecPage({
      components: [FaIconChooser],
    });

    const proHandleQuery = jest.fn((document: string, variables?: any) => {
      if (document.includes('query KitMetadata')) {
        return Promise.resolve({
          data: {
            me: {
              kit: {
                version: '7.0.0',
                technologySelected: 'svg',
                licenseSelected: 'pro',
                name: 'test-kit',
                permits: {
                  embedProSvg: [
                    { prefix: 'fas', family: 'classic' },
                    { prefix: 'far', family: 'classic' },
                    { prefix: 'fab', family: 'classic' },
                  ],
                },
                release: {
                  version: '7.0.0',
                  familyStyles: [
                    { family: 'classic', style: 'solid', prefix: 'fas' },
                    { family: 'classic', style: 'regular', prefix: 'far' },
                    { family: 'classic', style: 'brands', prefix: 'fab' },
                    { family: 'classic', style: 'light', prefix: 'fal' },
                    { family: 'classic', style: 'thin', prefix: 'fat' },
                    { family: 'duotone', style: 'solid', prefix: 'fad' },
                    { family: 'sharp', style: 'solid', prefix: 'fass' },
                    { family: 'sharp', style: 'regular', prefix: 'fasr' },
                  ],
                },
                iconUploads: [],
              },
            },
          },
        });
      }
      if (document.includes('query Search') && variables && variables.query === 'food') {
        return Promise.resolve({ data: foodSearchResults });
      }
      return Promise.resolve({ data: { search: [] } });
    });

    const getUrlText = jest.fn(url => {
      if (url.match(/\.js(\?|$)/)) {
        page.win['FontAwesome'] = {
          dom: {
            css: () => '/* fake css */',
          },
        };
        return Promise.resolve('// fake JavaScript');
      } else {
        return Promise.reject('fake rejection');
      }
    });

    const el = document.createElement('fa-icon-chooser');
    el.handleQuery = proHandleQuery;
    el.getUrlText = getUrlText;
    el.includeFamilyStyle = (familyStyle: { prefix: string }) => familyStyle.prefix === 'far';
    el.setAttribute('kit-token', 'fake-kit-token');

    // Override slot defaults that share JSX nodes (e.g. <strong> in start-view-detail);
    // shared JSX nodes can't be re-rendered across tests in the same file under Stencil
    // testing — providing user content via slots avoids the default JSX entirely.
    for (const name of ['start-view-detail', 'suggest-icon-upload', 'get-fontawesome-pro']) {
      const slotEl = document.createElement('span');
      slotEl.setAttribute('slot', name);
      slotEl.textContent = `test:${name}`;
      el.appendChild(slotEl);
    }

    page.body.appendChild(el);
    await page.waitForChanges();

    // Sanity check: the only familyStyle that survived the filter should be classic/regular (far).
    expect(page.rootInstance.familyStyles).toEqual({
      classic: { regular: { prefix: 'far' } },
    });

    // Set query state so the empty-query "start view" branch (which renders shared
    // JSX nodes from slotDefaults) is skipped on re-render. Then run the search,
    // bypassing the input debounce.
    page.rootInstance.query = 'food';
    await page.rootInstance.updateQueryResults('food');

    const filteredIcons = page.rootInstance.filteredIcons();

    // Every icon in the food results that includes {family:"classic", style:"regular"}
    // in its pro familyStyles list should appear under the 'far' prefix.
    expect(filteredIcons.length).toBeGreaterThan(0);
    filteredIcons.forEach(icon => {
      expect(icon.prefix).toBe('far');
    });

    const iconNames = filteredIcons.map(i => i.iconName);
    // These food entries all carry classic/regular in their pro family-styles list.
    expect(iconNames).toEqual(expect.arrayContaining(['pot-food', 'pan-food', 'can-food', 'bowl-food', 'burger', 'utensils']));
  });
});
