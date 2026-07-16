import { newSpecPage } from '@stencil/core/testing';
import { FaIconChooser } from './fa-icon-chooser';
import { buildDefaultIconsSearchResult, computeCacheKey } from '../../utils/utils';
import get from 'lodash/get';
import foodSearchResults from './food-search-results.fixture.json';
import { kitMetadataResponse, searchKitOfficialResponse, searchKitCustomResponse, showcaseIconsResponse } from '../../utils/__fixtures__/kitResponses';

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
      if (document.includes('query KitRevision')) {
        return Promise.resolve({ data: { me: { kit: { kitRevision: 1, showcaseCacheKey: 'kit:fake-kit-token:rev1' } } } });
      }
      if (document.includes('query KitMetadata')) {
        return Promise.resolve({
          data: {
            me: {
              kit: {
                showcaseCacheKey: 'kit:fake-kit-token:rev1',
                familyStylesPaginated: {
                  page: 1,
                  pageSize: 50,
                  totalFamilyStyleCount: 8,
                  totalPageCount: 1,
                  familyStyles: [
                    { familyStyle: { family: 'classic', style: 'solid', prefix: 'fas' } },
                    { familyStyle: { family: 'classic', style: 'regular', prefix: 'far' } },
                    { familyStyle: { family: 'classic', style: 'brands', prefix: 'fab' } },
                    { familyStyle: { family: 'classic', style: 'light', prefix: 'fal' } },
                    { familyStyle: { family: 'classic', style: 'thin', prefix: 'fat' } },
                    { familyStyle: { family: 'duotone', style: 'solid', prefix: 'fad' } },
                    { familyStyle: { family: 'sharp', style: 'solid', prefix: 'fass' } },
                    { familyStyle: { family: 'sharp', style: 'regular', prefix: 'fasr' } },
                  ],
                },
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
                },
                iconUploads: [],
              },
            },
          },
        });
      }
      // Kit mode now searches the kit's subset via Kit.searchKit. The food fixture's
      // entries are returned as 'far' icon variants (only classic/regular survives the
      // includeFamilyStyle filter in this test).
      if (document.includes('query SearchKit') && variables && variables.query === 'food') {
        const names = get(foodSearchResults, 'search', []).map((i: any) => i.id);
        return Promise.resolve({
          data: {
            me: {
              kit: {
                searchKit: {
                  page: 1,
                  pageSize: 50,
                  totalIconCount: names.length,
                  totalPageCount: 1,
                  icons: names.map((name: string) => ({
                    __typename: 'IconWithVariants',
                    name,
                    unicodeHex: 'f000',
                    variants: [{ name, unicodeHex: 'f000', familyStyle: { family: 'classic', style: 'regular', prefix: 'far' } }],
                  })),
                },
              },
            },
          },
        });
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

describe('fa-icon-chooser kit mode (subset-aware search & showcase)', () => {
  // Mounts the component in kit mode with a configurable handleQuery and waits for
  // initial load. Returns the spec page and the handleQuery jest mock.
  async function mountKit(handleQuery: any, kitMetadata: any = kitMetadataResponse) {
    const page = await newSpecPage({ components: [FaIconChooser] });

    const getUrlText = jest.fn((url: string) => {
      if (url.match(/\.js(\?|$)/)) {
        page.win['FontAwesome'] = {
          dom: { css: () => '/* fake css */' },
          findIconDefinition: () => ({ prefix: 'fas', iconName: 'fake', icon: [512, 512, [], 'f00d', 'M1 1z'] }),
        };
        return Promise.resolve('// fake JavaScript');
      }
      return Promise.reject('fake rejection');
    });

    const el = document.createElement('fa-icon-chooser');
    el.handleQuery = handleQuery;
    el.getUrlText = getUrlText;
    el.setAttribute('kit-token', 'fake-kit-token');

    // Provide user content for slots that otherwise render shared JSX nodes, which
    // cannot be re-rendered across tests in the same file under Stencil testing.
    for (const name of ['start-view-detail', 'suggest-icon-upload', 'get-fontawesome-pro', 'kit-has-no-uploaded-icons']) {
      const slotEl = document.createElement('span');
      slotEl.setAttribute('slot', name);
      slotEl.textContent = `test:${name}`;
      el.appendChild(slotEl);
    }

    // Allow per-test override of kit metadata.
    handleQuery.__kitMetadata = kitMetadata;

    page.body.appendChild(el);
    await page.waitForChanges();

    return { page, getUrlText };
  }

  // Default handleQuery: serves KitMetadata, a per-prefix ShowcaseIcons page, and a
  // configurable SearchKit response. Records all calls for inspection.
  function makeHandleQuery(searchResponse: any = searchKitOfficialResponse) {
    const fn: any = jest.fn((document: string, variables: any) => {
      // The never-cached kit-identity probe reads the same data.me.kit shape, so the
      // kit-metadata fixture answers it (its kitRevision/showcaseCacheKey are what the
      // component captures).
      if (document.includes('query KitRevision')) {
        return Promise.resolve(fn.__kitMetadata || kitMetadataResponse);
      }
      if (document.includes('query KitMetadata')) {
        return Promise.resolve(fn.__kitMetadata || kitMetadataResponse);
      }
      if (document.includes('query ShowcaseIcons')) {
        const prefix = get(variables, 'selector.prefix', 'fas');
        return Promise.resolve(showcaseIconsResponse(prefix));
      }
      if (document.includes('query SearchKit')) {
        return Promise.resolve(typeof searchResponse === 'function' ? searchResponse(variables) : searchResponse);
      }
      return Promise.resolve({ data: { search: [] } });
    });
    return fn;
  }

  const showcaseCalls = (hq: any) => (hq.mock.calls as any[]).filter(c => String(c[0]).includes('query ShowcaseIcons'));
  const searchKitCalls = (hq: any) => (hq.mock.calls as any[]).filter(c => String(c[0]).includes('query SearchKit'));

  // T010 [US1]
  it('searches the kit subset via Kit.searchKit (OFFICIAL) and populates icons', async () => {
    const handleQuery = makeHandleQuery(searchKitOfficialResponse);
    const { page } = await mountKit(handleQuery);

    page.rootInstance.query = 'arrow';
    await page.rootInstance.updateQueryResults('arrow');

    const searches = searchKitCalls(handleQuery);
    expect(searches.length).toBe(1);
    expect(searches[0][1]).toEqual(expect.objectContaining({ token: 'fake-kit-token', query: 'arrow', searchMode: 'OFFICIAL' }));

    // Selected family-style is classic/solid (fas); only the fas arrows should show.
    const filtered = page.rootInstance.filteredIcons();
    expect(filtered.map((i: any) => i.iconName)).toEqual(['arrow-right', 'arrow-left']);
    filtered.forEach((i: any) => expect(i.prefix).toBe('fas'));
  });

  // searchKit caps pageSize at 50; when the result set is larger the component
  // fetches a second page and merges the results.
  it('fetches a second searchKit page when results exceed the page-size cap', async () => {
    // Page 1 reports more icons than fit on one page; page 2 holds the remainder.
    const makeIcon = (name: string) => ({
      __typename: 'IconWithVariants',
      name,
      unicodeHex: 'f000',
      variants: [{ name, unicodeHex: 'f000', familyStyle: { family: 'classic', style: 'solid', prefix: 'fas' } }],
    });
    const searchResponse = (variables: any) => {
      const icons = variables.page === 1 ? ['icon-a', 'icon-b'] : ['icon-c'];
      return {
        data: {
          me: {
            kit: {
              searchKit: { page: variables.page, pageSize: 50, totalIconCount: 3, totalPageCount: 2, icons: icons.map(makeIcon) },
            },
          },
        },
      };
    };

    const handleQuery = makeHandleQuery(searchResponse);
    const { page } = await mountKit(handleQuery);

    page.rootInstance.query = 'icon';
    await page.rootInstance.updateQueryResults('icon');

    const searches = searchKitCalls(handleQuery);
    expect(searches.length).toBe(2);
    expect(searches[0][1]).toEqual(expect.objectContaining({ page: 1, pageSize: 50 }));
    expect(searches[1][1]).toEqual(expect.objectContaining({ page: 2, pageSize: 50 }));

    // Both pages' icons are present.
    const filtered = page.rootInstance.filteredIcons();
    expect(filtered.map((i: any) => i.iconName)).toEqual(['icon-a', 'icon-b', 'icon-c']);
  });

  // searchKit results that fit on a single page must not trigger a second fetch.
  it('does not fetch a second searchKit page when results fit on one page', async () => {
    const handleQuery = makeHandleQuery(searchKitOfficialResponse);
    const { page } = await mountKit(handleQuery);

    page.rootInstance.query = 'arrow';
    await page.rootInstance.updateQueryResults('arrow');

    expect(searchKitCalls(handleQuery).length).toBe(1);
  });

  // T010 [US1] — non-kit regression: legacy `search` is used, not `searchKit`.
  it('uses the legacy search field when no kit token is present', async () => {
    const page = await newSpecPage({ components: [FaIconChooser] });
    const handleQuery = jest.fn(() => Promise.resolve({ data: { search: [] } }));
    const getUrlText = jest.fn((url: string) => {
      if (url.match(/all\.js/)) {
        page.win['FontAwesome'] = { dom: { css: () => '/* css */' } };
        return Promise.resolve('// js');
      }
      return Promise.reject('rej');
    });
    const el = document.createElement('fa-icon-chooser');
    el.handleQuery = handleQuery;
    el.getUrlText = getUrlText;
    el.setAttribute('version', '6.0.0');
    for (const name of ['start-view-detail', 'suggest-icon-upload', 'get-fontawesome-pro']) {
      const slotEl = document.createElement('span');
      slotEl.setAttribute('slot', name);
      slotEl.textContent = `test:${name}`;
      el.appendChild(slotEl);
    }
    page.body.appendChild(el);
    await page.waitForChanges();

    await page.rootInstance.updateQueryResults('star');

    const docs = (handleQuery.mock.calls as any[]).map(c => String(c[0]));
    expect(docs.some(d => d.includes('query Search(') && !d.includes('SearchKit'))).toBe(true);
    expect(docs.some(d => d.includes('query SearchKit'))).toBe(false);
  });

  // T014 [US2]
  it('lazily fetches the showcase per family-style and caches by prefix', async () => {
    const handleQuery = makeHandleQuery();
    const { page } = await mountKit(handleQuery);

    // On open, exactly one showcase fetch for the selected family-style (fas).
    expect(showcaseCalls(handleQuery).length).toBe(1);
    expect(showcaseCalls(handleQuery)[0][1]).toEqual(expect.objectContaining({ selector: { prefix: 'fas' } }));

    // Switching to a new style triggers exactly one new fetch.
    page.rootInstance.selectStyle({ target: { value: 'regular' } });
    await page.waitForChanges();
    expect(showcaseCalls(handleQuery).length).toBe(2);
    expect(showcaseCalls(handleQuery)[1][1]).toEqual(expect.objectContaining({ selector: { prefix: 'far' } }));

    // Re-selecting an already-loaded style does not refetch (in-memory cache).
    page.rootInstance.selectStyle({ target: { value: 'solid' } });
    await page.waitForChanges();
    expect(showcaseCalls(handleQuery).length).toBe(2);
  });

  // T014 [US2] — custom family-styles use the kit's uploads, not a showcase fetch.
  it('populates custom family-styles from kit uploads without a showcase fetch', async () => {
    const handleQuery = makeHandleQuery();
    const { page } = await mountKit(handleQuery);

    const beforeCustom = showcaseCalls(handleQuery).length;
    page.rootInstance.selectFamily({ target: { value: 'kit' } });
    await page.waitForChanges();

    // No new showcase fetch for the custom family-style.
    expect(showcaseCalls(handleQuery).length).toBe(beforeCustom);

    // The uploaded single-path custom icon (fak) is shown.
    const filtered = page.rootInstance.filteredIcons();
    expect(filtered.map((i: any) => i.iconName)).toContain('my-logo');
    filtered.forEach((i: any) => expect(i.prefix).toBe('fak'));
  });

  // T016 [US2] — offered family-styles are limited to the kit subset
  // (Kit.familyStylesPaginated); no style the subset excludes appears.
  it('offers only the kit subset family-styles', async () => {
    const subsetKit = {
      data: {
        me: {
          kit: {
            showcaseCacheKey: 'kit:subset-kit:rev1',
            // The kit's subset is just classic solid, even though this kit's pro license
            // and release would permit far/fab and more.
            familyStylesPaginated: {
              page: 1,
              pageSize: 50,
              totalFamilyStyleCount: 1,
              totalPageCount: 1,
              familyStyles: [{ familyStyle: { family: 'classic', style: 'solid', prefix: 'fas' } }],
            },
            version: '7.0.0',
            technologySelected: 'svg',
            licenseSelected: 'pro',
            name: 'subset-kit',
            permits: { embedProSvg: [{ prefix: 'fas', family: 'classic' }] },
            release: {
              version: '7.0.0',
            },
            iconUploads: [],
          },
        },
      },
    };
    const handleQuery = makeHandleQuery();
    const { page } = await mountKit(handleQuery, subsetKit);

    // Only classic/solid is offered — what the kit's subset contains.
    expect(page.rootInstance.familyStyles).toEqual({ classic: { solid: { prefix: 'fas' } } });
    expect(page.rootInstance.selectedFamily).toBe('classic');
    expect(page.rootInstance.selectedStyle).toBe('solid');
  });

  // T016 [US2] — default family-style is classic solid when present.
  it('defaults the selected family-style to classic solid when present', async () => {
    const handleQuery = makeHandleQuery();
    const { page } = await mountKit(handleQuery);
    expect(page.rootInstance.selectedFamily).toBe('classic');
    expect(page.rootInstance.selectedStyle).toBe('solid');
  });

  // T015 [US2] — falls back to the kit's first available family-style otherwise.
  it('defaults to the first available family-style when classic solid is absent', async () => {
    const sharpOnly = {
      data: {
        me: {
          kit: {
            showcaseCacheKey: 'kit:sharp-kit:rev3',
            familyStylesPaginated: {
              page: 1,
              pageSize: 50,
              totalFamilyStyleCount: 1,
              totalPageCount: 1,
              familyStyles: [{ familyStyle: { family: 'sharp', style: 'solid', prefix: 'fass' } }],
            },
            version: '7.0.0',
            technologySelected: 'svg',
            licenseSelected: 'pro',
            name: 'sharp-kit',
            permits: { embedProSvg: [{ prefix: 'fass', family: 'sharp' }] },
            release: { version: '7.0.0' },
            iconUploads: [],
          },
        },
      },
    };
    const handleQuery = makeHandleQuery();
    const { page } = await mountKit(handleQuery, sharpOnly);
    expect(page.rootInstance.selectedFamily).toBe('sharp');
    expect(page.rootInstance.selectedStyle).toBe('solid');
  });

  // T022 [US3] — custom-style search uses CUSTOM mode and resolves to uploads.
  it('searches custom family-styles with searchMode CUSTOM and renders uploads', async () => {
    const handleQuery = makeHandleQuery(searchKitCustomResponse);
    const { page } = await mountKit(handleQuery);

    page.rootInstance.selectFamily({ target: { value: 'kit' } });
    await page.waitForChanges();

    page.rootInstance.query = 'my';
    await page.rootInstance.updateQueryResults('my');

    const searches = searchKitCalls(handleQuery);
    expect(searches[searches.length - 1][1]).toEqual(expect.objectContaining({ searchMode: 'CUSTOM' }));

    const filtered = page.rootInstance.filteredIcons();
    expect(filtered.map((i: any) => i.iconName)).toContain('my-logo');
    // The matched custom result carries upload path data for rendering.
    expect(get(filtered[0], 'iconUpload')).toBeTruthy();
  });

  // T026 [US4] — showcase requests carry a self-contained cacheKey hashed from the
  // query, its variables, the kit revision, and the kit-provided showcaseCacheKey.
  it('passes a computed showcase cacheKey derived from query, variables, kitRevision, and showcaseCacheKey', async () => {
    const handleQuery = makeHandleQuery();
    await mountKit(handleQuery);

    const showcase = showcaseCalls(handleQuery)[0];
    const [document, variables] = showcase;
    expect(showcase[2]).toEqual({
      cache: true,
      cacheKey: computeCacheKey(document, variables, 7, 'kit:fake-kit-token:rev7'),
    });
  });

  // A kit whose subset resolves to zero family-styles (and no uploads) can't show or
  // search anything, so it presents the same empty screen as a search with no results
  // — not the opening "start view" heading stacked on top of it.
  it('shows the no-results empty screen when the kit subset is empty', async () => {
    const emptyKit = {
      data: {
        me: {
          kit: {
            kitRevision: 1,
            showcaseCacheKey: 'kit:empty-kit:rev1',
            familyStylesPaginated: { page: 1, pageSize: 50, totalFamilyStyleCount: 0, totalPageCount: 0, familyStyles: [] },
            version: '7.0.0',
            technologySelected: 'svg',
            licenseSelected: 'pro',
            name: 'empty-kit',
            permits: { embedProSvg: [] },
            release: { version: '7.0.0' },
            iconUploads: [],
          },
        },
      },
    };
    const handleQuery = makeHandleQuery();
    const { page } = await mountKit(handleQuery, emptyKit);

    // No family-style survived the subset, and no showcase was even attempted.
    expect(page.rootInstance.familyStyles).toEqual({});
    expect(showcaseCalls(handleQuery).length).toBe(0);

    // The listing area shows the no-results screen, and the opening start-view article
    // (its distinctive `line-length-lg` class) is suppressed.
    const html = page.root.shadowRoot.innerHTML;
    expect(html).toContain('message-noresults');
    expect(html).not.toContain('line-length-lg');
  });

  // Pro Lite is a `pro` license with NO embed permits (empty permits.embedProSvg). Such
  // kits must NOT receive SVG path data from the chooser — only the bare lookup — unless
  // the official back-door escape hatch (window.__FA_SVG_EMBED__) is enabled. Kit mode
  // must not side-step this: embedSvgPrefixes for a pro kit is sourced solely from
  // permits.embedProSvg, so an empty permits list leaves the SVG gate closed.
  it('withholds SVG data for a Pro Lite kit (empty embedProSvg) unless the override is set', async () => {
    const liteKit = {
      data: {
        me: {
          kit: {
            kitRevision: 1,
            showcaseCacheKey: 'kit:lite-kit:rev1',
            familyStylesPaginated: {
              page: 1,
              pageSize: 50,
              totalFamilyStyleCount: 1,
              totalPageCount: 1,
              familyStyles: [{ familyStyle: { family: 'classic', style: 'solid', prefix: 'fas' } }],
            },
            version: '7.0.0',
            technologySelected: 'svg',
            licenseSelected: 'pro',
            name: 'lite-kit',
            // Pro Lite signal: a pro license, but no SVG-embed permits.
            permits: { embedProSvg: [] },
            release: { version: '7.0.0' },
            iconUploads: [],
          },
        },
      },
    };
    const handleQuery = makeHandleQuery();
    const { page } = await mountKit(handleQuery, liteKit);

    // It reports as `pro`, but with no embed permits the SVG gate is closed.
    expect(page.rootInstance.pro()).toBe(true);
    expect(page.rootInstance.embedSvgPrefixes.size).toBe(0);
    expect(page.rootInstance.shouldEmitSvgData()).toBe(false);

    const results: any[] = [];
    page.root.addEventListener('finish', (e: any) => results.push(e.detail));

    // A full icon definition carrying SVG path data — the thing Pro Lite must not get.
    const iconDefinition = { prefix: 'fas', iconName: 'house', icon: [512, 512, [], 'f015', 'M1 1z'] };

    // Pro Lite, no override: only the bare lookup (no `icon` path data) is emitted.
    page.rootInstance.emitIconChooserResult(iconDefinition);
    expect(results[0]).toEqual({ prefix: 'fas', iconName: 'house', family: 'classic', style: 'solid' });
    expect(results[0].icon).toBeUndefined();

    // The official escape hatch (FA WordPress plugin) re-enables full SVG emission.
    (page.win as any).__FA_SVG_EMBED__ = () => true;
    try {
      expect(page.rootInstance.shouldEmitSvgData()).toBe(true);
      page.rootInstance.emitIconChooserResult(iconDefinition);
      expect(results[1]).toEqual({ prefix: 'fas', iconName: 'house', icon: [512, 512, [], 'f015', 'M1 1z'], family: 'classic', style: 'solid' });
    } finally {
      delete (page.win as any).__FA_SVG_EMBED__;
    }
  });
});
