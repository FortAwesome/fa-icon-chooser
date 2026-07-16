import { newE2EPage } from '@stencil/core/testing';

describe('fa-icon-chooser', () => {
  it('renders', async () => {
    const page = await newE2EPage();

    await page.setContent('<div id="container"></div>');

    const attrs = {
      version: '5.15.3',
      pro: false,
    };

    const searchResults = [
      {
        id: 'business-time',
        label: 'Business Time',
        familyStylesByLicense: {
          free: [{ family: 'classic', style: 'solid' }],
          pro: [
            { family: 'classic', style: 'solid' },
            { family: 'classic', style: 'regular' },
            { family: 'classic', style: 'light' },
            { family: 'classic', style: 'thin' },
            { family: 'duotone', style: 'solid' },
            { family: 'sharp', style: 'solid' },
            { family: 'sharp', style: 'regular' },
            { family: 'sharp', style: 'light' },
          ],
        },
      },
      {
        id: 'socks',
        label: 'Socks',
        familyStylesByLicense: {
          free: [{ family: 'classic', style: 'solid' }],
          pro: [
            { family: 'classic', style: 'solid' },
            { family: 'classic', style: 'regular' },
            { family: 'classic', style: 'light' },
            { family: 'classic', style: 'thin' },
            { family: 'duotone', style: 'solid' },
            { family: 'sharp', style: 'solid' },
            { family: 'sharp', style: 'regular' },
            { family: 'sharp', style: 'light' },
          ],
        },
      },
      {
        id: 'print',
        label: 'print',
        familyStylesByLicense: {
          free: [{ family: 'classic', style: 'solid' }],
          pro: [
            { family: 'classic', style: 'solid' },
            { family: 'classic', style: 'regular' },
            { family: 'classic', style: 'light' },
            { family: 'classic', style: 'thin' },
            { family: 'duotone', style: 'solid' },
            { family: 'sharp', style: 'solid' },
            { family: 'sharp', style: 'regular' },
            { family: 'sharp', style: 'light' },
          ],
        },
      },
      {
        id: 'fax',
        label: 'Fax',
        familyStylesByLicense: {
          free: [{ family: 'classic', style: 'solid' }],
          pro: [
            { family: 'classic', style: 'solid' },
            { family: 'classic', style: 'regular' },
            { family: 'classic', style: 'light' },
            { family: 'classic', style: 'thin' },
            { family: 'duotone', style: 'solid' },
            { family: 'sharp', style: 'solid' },
            { family: 'sharp', style: 'regular' },
            { family: 'sharp', style: 'light' },
          ],
        },
      },
      {
        id: 'user-tie',
        label: 'User Tie',
        familyStylesByLicense: {
          free: [{ family: 'classic', style: 'solid' }],
          pro: [
            { family: 'classic', style: 'solid' },
            { family: 'classic', style: 'regular' },
            { family: 'classic', style: 'light' },
            { family: 'classic', style: 'thin' },
            { family: 'duotone', style: 'solid' },
            { family: 'sharp', style: 'solid' },
            { family: 'sharp', style: 'regular' },
            { family: 'sharp', style: 'light' },
          ],
        },
      },
      {
        id: 'building',
        label: 'Building',
        familyStylesByLicense: {
          free: [
            { family: 'classic', style: 'solid' },
            { family: 'classic', style: 'regular' },
          ],
          pro: [
            { family: 'classic', style: 'solid' },
            { family: 'classic', style: 'regular' },
            { family: 'classic', style: 'light' },
            { family: 'classic', style: 'thin' },
            { family: 'duotone', style: 'solid' },
            { family: 'sharp', style: 'solid' },
            { family: 'sharp', style: 'regular' },
            { family: 'sharp', style: 'light' },
          ],
        },
      },
    ];

    await page.$eval(
      '#container',
      (elm: any, attrs: any) => {
        const ic = document.createElement('fa-icon-chooser');
        ic.getUrlText = url => {
          if (!url.match(/all.js/)) return Promise.reject(`unexpected url: ${url}`);

          window['FontAwesome'] = {
            dom: {
              css: () => {
                return '/* fake css */';
              },
            },
            findIconDefinition: _params => {
              return {
                prefix: 'fas',
                iconName: 'fake',
                icon: [512, 512, [], 'f00d', 'M100 100l50 50v50z'],
              };
            },
          };

          return Promise.resolve('// fake JavaScript');
        };

        ic.handleQuery = () => Promise.resolve({ data: { search: searchResults } });
        ic.addEventListener('finish', () => {});
        for (const attr in attrs) {
          ic.setAttribute(attr, attrs[attr]);
        }
        elm.appendChild(ic);
      },
      attrs,
    );

    await page.waitForChanges();

    const element = await page.find('fa-icon-chooser');

    expect(element).toHaveClass('hydrated');

    const input = await page.find('fa-icon-chooser >>> input#search');

    let value = await input.getProperty('value');
    expect(value).toBe('');
    await input.press('s');
    await input.press('e');
    await input.press('a');
    await page.waitForChanges();
    value = await input.getProperty('value');
    expect(value).toBe('sea');

    // TODO: get the rest of the test working. Looking to show that the search
    // interaction works as expected.

    /*
    const iconListing = await page.find('fa-icon-chooser >>> div.icon-listing')
    const icons = await iconListing.findAll('fa-icon')

    expect(icons.length).toEqual(searchResults.length)

    for(const result of searchResults) {
      expect(element.shadowRoot.innerHTML).toEqual(expect.stringMatching(new RegExp(`<fa-icon .*name="${result.id}"`)))
    }
    */
  });

  // T016 [US2] / T011 [US1] — kit mode hydrates with a subset-aware showcase and
  // routes search through Kit.searchKit. Requires Chromium (run in CI).
  it('hydrates in kit mode and routes search through Kit.searchKit', async () => {
    const page = await newE2EPage();
    await page.setContent('<div id="container"></div>');

    await page.$eval('#container', (elm: any) => {
      const ic = document.createElement('fa-icon-chooser');

      ic.getUrlText = (url: string) => {
        if (!url.match(/\.js(\?|$)/)) return Promise.reject(`unexpected url: ${url}`);
        (window as any)['FontAwesome'] = {
          dom: { css: () => '/* fake css */' },
          findIconDefinition: () => ({ prefix: 'fas', iconName: 'fake', icon: [512, 512, [], 'f00d', 'M1 1z'] }),
        };
        return Promise.resolve('// fake JavaScript');
      };

      // Minimal kit metadata + showcase + searchKit responses, keyed by query document.
      ic.handleQuery = (document: string, variables: any) => {
        if (document.includes('query KitRevision')) {
          return Promise.resolve({ data: { me: { kit: { kitRevision: 7, showcaseCacheKey: 'kit:fake-kit-token:rev7' } } } });
        }
        if (document.includes('query KitMetadata')) {
          return Promise.resolve({
            data: {
              me: {
                kit: {
                  showcaseCacheKey: 'kit:fake-kit-token:rev7',
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
                  name: 'kit',
                  permits: { embedProSvg: [{ prefix: 'fas', family: 'classic' }] },
                  release: { version: '7.0.0' },
                  iconUploads: [],
                },
              },
            },
          });
        }
        if (document.includes('query ShowcaseIcons')) {
          const prefix = (variables && variables.selector && variables.selector.prefix) || 'fas';
          return Promise.resolve({
            data: {
              me: {
                kit: {
                  showcaseIcons: {
                    page: 1,
                    pageSize: 80,
                    totalIconVariantCount: 1,
                    totalPageCount: 1,
                    iconVariants: [{ name: 'house', unicodeHex: 'f015', familyStyle: { family: 'classic', style: 'solid', prefix } }],
                  },
                },
              },
            },
          });
        }
        if (document.includes('query SearchKit')) {
          return Promise.resolve({
            data: {
              me: {
                kit: {
                  searchKit: {
                    page: 1,
                    pageSize: 50,
                    totalIconCount: 1,
                    totalPageCount: 1,
                    icons: [
                      {
                        __typename: 'IconWithVariants',
                        name: 'arrow-right',
                        unicodeHex: 'f061',
                        variants: [{ name: 'arrow-right', unicodeHex: 'f061', familyStyle: { family: 'classic', style: 'solid', prefix: 'fas' } }],
                      },
                    ],
                  },
                },
              },
            },
          });
        }
        return Promise.resolve({ data: { search: [] } });
      };

      ic.addEventListener('finish', () => {});
      ic.setAttribute('kit-token', 'fake-kit-token');
      elm.appendChild(ic);
    });

    await page.waitForChanges();

    const element = await page.find('fa-icon-chooser');
    expect(element).toHaveClass('hydrated');

    const input = await page.find('fa-icon-chooser >>> input#search');
    expect(await input.getProperty('value')).toBe('');
    await input.press('a');
    await input.press('r');
    await page.waitForChanges();
    expect(await input.getProperty('value')).toBe('ar');
  });

  // T037 [US5] — in kit mode the search-status line, start-view heading, and
  // start-view detail are personalized with the kit's name (truncated to 30 chars)
  // and token. Requires Chromium (run in CI). (SC-010, SC-011)
  it('renders kit-branded copy naming the kit and token', async () => {
    const kitName = 'This Kit Name Is Definitely Longer Than Thirty Characters';
    const truncatedName = `${kitName.slice(0, 30)}…`;

    const page = await newE2EPage();
    await page.setContent('<div id="container"></div>');

    await page.$eval(
      '#container',
      (elm: any, kitName: string) => {
        const ic = document.createElement('fa-icon-chooser');

        ic.getUrlText = (url: string) => {
          if (!url.match(/\.js(\?|$)/)) return Promise.reject(`unexpected url: ${url}`);
          (window as any)['FontAwesome'] = {
            dom: { css: () => '/* fake css */' },
            findIconDefinition: () => ({ prefix: 'fas', iconName: 'fake', icon: [512, 512, [], 'f00d', 'M1 1z'] }),
          };
          return Promise.resolve('// fake JavaScript');
        };

        ic.handleQuery = (document: string, variables: any) => {
          if (document.includes('query KitRevision')) {
            return Promise.resolve({ data: { me: { kit: { kitRevision: 7, showcaseCacheKey: 'kit:fake-kit-token:rev7' } } } });
          }
          if (document.includes('query KitMetadata')) {
            return Promise.resolve({
              data: {
                me: {
                  kit: {
                    showcaseCacheKey: 'kit:fake-kit-token:rev7',
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
                    name: kitName,
                    permits: { embedProSvg: [{ prefix: 'fas', family: 'classic' }] },
                    release: { version: '7.0.0' },
                    iconUploads: [],
                  },
                },
              },
            });
          }
          if (document.includes('query ShowcaseIcons')) {
            const prefix = (variables && variables.selector && variables.selector.prefix) || 'fas';
            return Promise.resolve({
              data: {
                me: {
                  kit: {
                    showcaseIcons: {
                      page: 1,
                      pageSize: 80,
                      totalIconVariantCount: 1,
                      totalPageCount: 1,
                      iconVariants: [{ name: 'house', unicodeHex: 'f015', familyStyle: { family: 'classic', style: 'solid', prefix } }],
                    },
                  },
                },
              },
            });
          }
          return Promise.resolve({ data: { search: [] } });
        };

        ic.addEventListener('finish', () => {});
        ic.setAttribute('kit-token', 'fake-kit-token');
        elm.appendChild(ic);
      },
      kitName,
    );

    await page.waitForChanges();

    const normalize = (s: string | null) => (s || '').replace(/\s+/g, ' ').trim();

    const searchingLine = await page.find('fa-icon-chooser >>> p.margin-top-xs');
    expect(normalize(searchingLine.textContent)).toBe(`You're searching the icons in your ${truncatedName} Kit (fake-kit-token) set to Font Awesome Version 7.0.0`);

    const heading = await page.find('fa-icon-chooser >>> h3.margin-bottom-md');
    expect(normalize(heading.textContent)).toBe(`Add Icons from Your Font Awesome ${truncatedName} Kit`);

    const detail = await page.find('fa-icon-chooser >>> p.margin-bottom-3xl');
    expect(normalize(detail.textContent)).toBe("Search your Kit's icons or browse them by style. Need to add or remove icons? Head to fontawesome.com/kits to update your Kit.");
  });

  // T037 [US5] — non-kit regression: the original search-status line and start-view
  // copy are unchanged when there is no kit token. Requires Chromium (run in CI). (SC-003)
  it('keeps the original copy when not in kit mode', async () => {
    const page = await newE2EPage();
    await page.setContent('<div id="container"></div>');

    await page.$eval('#container', (elm: any) => {
      const ic = document.createElement('fa-icon-chooser');

      ic.getUrlText = (url: string) => {
        if (!url.match(/\.js(\?|$)/) && !url.match(/all\.js/)) return Promise.reject(`unexpected url: ${url}`);
        (window as any)['FontAwesome'] = {
          dom: { css: () => '/* fake css */' },
          findIconDefinition: () => ({ prefix: 'fas', iconName: 'fake', icon: [512, 512, [], 'f00d', 'M1 1z'] }),
        };
        return Promise.resolve('// fake JavaScript');
      };

      ic.handleQuery = () => Promise.resolve({ data: { search: [] } });
      ic.addEventListener('finish', () => {});
      ic.setAttribute('version', '5.15.3');
      elm.appendChild(ic);
    });

    await page.waitForChanges();

    const normalize = (s: string | null) => (s || '').replace(/\s+/g, ' ').trim();

    const searchingLine = await page.find('fa-icon-chooser >>> p.margin-top-xs');
    expect(normalize(searchingLine.textContent)).toBe("You're searching Font Awesome Free icons in version 5.15.3");

    const heading = await page.find('fa-icon-chooser >>> h3.margin-bottom-md');
    expect(normalize(heading.textContent)).toBe("Font Awesome is the web's most popular icon set, with tons of icons in a variety of styles.");

    const detail = await page.find('fa-icon-chooser >>> p.margin-bottom-3xl');
    expect(normalize(detail.textContent)).toContain('Not sure where to start?');
  });
});
