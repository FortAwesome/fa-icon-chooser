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
});
