import {
  parseSvgText,
  IconChooserResult,
  isValidSemver,
  createFontAwesomeScriptElement,
  IconLookupWithFamilyStyle,
  searchKitIconsToIconLookups,
  showcaseIconsToIconLookups,
  showcaseCacheKeyFromResponse,
  kitFamilyStylesFromResponse,
  searchModeForPrefix,
  truncateKitName,
} from './utils';
import { kitMetadataResponse, searchKitOfficialResponse, searchKitCustomResponse, searchKitEmptyResponse, showcaseIconsResponse } from './__fixtures__/kitResponses';

describe('parseSvgText', () => {
  const normalSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path d="M1 1 h1 z"/></svg>`;

  const normalSvgWithComment = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><!-- Font Awesome Pro 5.15.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) --><path d="M1 1 h1 z"/></svg>`;

  const duotoneSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><defs><style>.fa-secondary{opacity:.4}</style></defs><path d="M2 2 h2 z" class="fa-secondary"/><path d="M1 1 h1 z" class="fa-primary"/></svg>`;

  const duotoneSvgWithComment = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><!-- Font Awesome Pro 5.15.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) --><defs><style>.fa-secondary{opacity:.4}</style></defs><path d="M2 2 h2 z" class="fa-secondary"/><path d="M1 1 h1 z" class="fa-primary"/></svg>`;

  const duotoneSvgWithClassBeforeD = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><defs><style>.fa-secondary{opacity:.4}</style></defs><path class="fa-secondary" d="M2 2 h2 z"/><path class="fa-primary" d="M1 1 h1 z"/></svg>`;

  const duotoneSvgInvertedPrimarySecondary = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><defs><style>.fa-secondary{opacity:.4}</style></defs><path class="fa-primary" d="M1 1 h1 z"/><path class="fa-secondary" d="M2 2 h2 z"/></svg>`;

  const duotoneSvgOnlyPrimary = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><defs><style>.fa-secondary{opacity:.4}</style></defs><path class="fa-primary" d="M1 1 h1 z"/></svg>`;

  const duotoneSvgOnlySecondary = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><defs><style>.fa-secondary{opacity:.4}</style></defs><path class="fa-secondary" d="M2 2 h2 z"/></svg>`;

  it('tests normal', () => {
    expect(parseSvgText(normalSvgWithComment)).toEqual([640, 512, [], null, 'M1 1 h1 z']);
  });

  it('tests normal with comment', () => {
    expect(parseSvgText(normalSvg)).toEqual([640, 512, [], null, 'M1 1 h1 z']);
  });

  it('tests duotone', () => {
    expect(parseSvgText(duotoneSvg)).toEqual([640, 512, [], null, ['M2 2 h2 z', 'M1 1 h1 z']]);
  });

  it('tests duotone with comment', () => {
    expect(parseSvgText(duotoneSvgWithComment)).toEqual([640, 512, [], null, ['M2 2 h2 z', 'M1 1 h1 z']]);
  });

  it('tests duotone with class before d', () => {
    expect(parseSvgText(duotoneSvgWithClassBeforeD)).toEqual([640, 512, [], null, ['M2 2 h2 z', 'M1 1 h1 z']]);
  });

  it('tests duotone with inverted primary and secondary', () => {
    expect(parseSvgText(duotoneSvgInvertedPrimarySecondary)).toEqual([640, 512, [], null, ['M2 2 h2 z', 'M1 1 h1 z']]);
  });

  it('tests duotone with only primary', () => {
    expect(parseSvgText(duotoneSvgOnlyPrimary)).toEqual([640, 512, [], null, ['', 'M1 1 h1 z']]);
  });

  it('tests duotone with only secondary', () => {
    expect(parseSvgText(duotoneSvgOnlySecondary)).toEqual([640, 512, [], null, ['M2 2 h2 z', '']]);
  });

  describe('edge cases', () => {
    it('returns null for malformed SVG', () => {
      const malformedSvg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="M1 1 h1 z"/></svg>`;
      expect(parseSvgText(malformedSvg)).toBeNull();
    });

    it('returns null for SVG without path', () => {
      const svgWithoutPath = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"></svg>`;
      expect(parseSvgText(svgWithoutPath)).toBeNull();
    });
  });
});

describe('IconChooserResult typing', () => {
  test('plain icon', () => {
    const star: IconLookupWithFamilyStyle = {
      prefix: 'fas',
      iconName: 'star',
      family: 'classic',
      style: 'solid',
    };

    const result: IconChooserResult = star;

    expect(result.iconName).toEqual('star');
  });
});

describe('isSemver', () => {
  test('when valid', () => {
    expect(isValidSemver('5.13.5')).toBe(true);
    expect(isValidSemver('6.0.0-beta1')).toBe(true);
  });

  test('when invalid', () => {
    expect(isValidSemver('5.x')).toBe(false);
    expect(isValidSemver('5.13.5.foo.bar')).toBe(false);
  });
});

describe('searchModeForPrefix', () => {
  test('custom upload prefixes map to CUSTOM', () => {
    expect(searchModeForPrefix('fak')).toBe('CUSTOM');
    expect(searchModeForPrefix('fakd')).toBe('CUSTOM');
  });

  test('official prefixes map to OFFICIAL', () => {
    expect(searchModeForPrefix('fas')).toBe('OFFICIAL');
    expect(searchModeForPrefix('far')).toBe('OFFICIAL');
    expect(searchModeForPrefix('fab')).toBe('OFFICIAL');
    expect(searchModeForPrefix('fad')).toBe('OFFICIAL');
  });
});

describe('searchKitIconsToIconLookups', () => {
  test('maps OFFICIAL IconWithVariants union members to one { iconName, prefix } per variant', () => {
    const lookups = searchKitIconsToIconLookups(searchKitOfficialResponse);
    expect(lookups).toEqual([
      { iconName: 'arrow-right', prefix: 'fas' },
      { iconName: 'arrow-right', prefix: 'far' },
      { iconName: 'arrow-left', prefix: 'fas' },
    ]);
  });

  test('maps CUSTOM IconUpload union members to { iconName } (prefix undefined)', () => {
    const lookups = searchKitIconsToIconLookups(searchKitCustomResponse);
    expect(lookups).toEqual([{ iconName: 'my-logo', prefix: undefined }]);
  });

  test('returns [] for an empty result', () => {
    expect(searchKitIconsToIconLookups(searchKitEmptyResponse)).toEqual([]);
  });

  test('returns [] for a null/undefined response', () => {
    expect(searchKitIconsToIconLookups(null)).toEqual([]);
    expect(searchKitIconsToIconLookups(undefined)).toEqual([]);
  });

  test('skips variants missing a prefix and icons missing a name', () => {
    const response = {
      data: {
        me: {
          kit: {
            searchKit: {
              icons: [
                {
                  __typename: 'IconWithVariants',
                  name: 'ok',
                  variants: [
                    { name: 'ok', familyStyle: { prefix: 'fas' } },
                    { name: 'ok', familyStyle: {} },
                  ],
                },
                { __typename: 'IconWithVariants', variants: [{ name: 'no-name', familyStyle: { prefix: 'fas' } }] },
              ],
            },
          },
        },
      },
    };
    expect(searchKitIconsToIconLookups(response)).toEqual([{ iconName: 'ok', prefix: 'fas' }]);
  });
});

describe('showcaseIconsToIconLookups', () => {
  test('maps showcaseIcons variants to { iconName, prefix }', () => {
    const response = showcaseIconsResponse('fas', ['house', 'gear']);
    expect(showcaseIconsToIconLookups(response)).toEqual([
      { iconName: 'house', prefix: 'fas' },
      { iconName: 'gear', prefix: 'fas' },
    ]);
  });

  test('returns [] for an empty result / null response', () => {
    expect(showcaseIconsToIconLookups(showcaseIconsResponse('fas', []))).toEqual([]);
    expect(showcaseIconsToIconLookups(null)).toEqual([]);
  });
});

describe('showcaseCacheKeyFromResponse', () => {
  test('reads Kit.showcaseCacheKey when present', () => {
    expect(showcaseCacheKeyFromResponse(kitMetadataResponse)).toBe('kit:fake-kit-token:rev7');
  });

  test('returns undefined when absent', () => {
    expect(showcaseCacheKeyFromResponse({ data: { me: { kit: {} } } })).toBeUndefined();
    expect(showcaseCacheKeyFromResponse(null)).toBeUndefined();
  });
});

describe('kitFamilyStylesFromResponse', () => {
  test('reads the kit subset family-styles', () => {
    expect(kitFamilyStylesFromResponse(kitMetadataResponse)).toEqual([
      { family: 'classic', style: 'solid', prefix: 'fas' },
      { family: 'classic', style: 'regular', prefix: 'far' },
      { family: 'classic', style: 'brands', prefix: 'fab' },
    ]);
  });

  test('returns [] when absent', () => {
    expect(kitFamilyStylesFromResponse({ data: { me: { kit: {} } } })).toEqual([]);
    expect(kitFamilyStylesFromResponse(null)).toEqual([]);
  });

  test('skips nodes missing family, style, or prefix', () => {
    const partial = {
      data: {
        me: {
          kit: {
            familyStylesPaginated: {
              familyStyles: [{ familyStyle: { family: 'classic', style: 'solid', prefix: 'fas' } }, { familyStyle: { prefix: 'far' } }, { familyStyle: null }, {}],
            },
          },
        },
      },
    };

    expect(kitFamilyStylesFromResponse(partial)).toEqual([{ family: 'classic', style: 'solid', prefix: 'fas' }]);
  });
});

describe('truncateKitName', () => {
  test('a name of 30 characters or fewer is returned unchanged (no ellipsis)', () => {
    expect(truncateKitName('Marketing Site')).toBe('Marketing Site');
    const exactly30 = 'a'.repeat(30);
    expect(exactly30.length).toBe(30);
    expect(truncateKitName(exactly30)).toBe(exactly30);
  });

  test('a name longer than 30 characters is truncated to its first 30 chars plus an ellipsis', () => {
    const longName = 'This Kit Name Is Definitely Longer Than Thirty Characters';
    expect(longName.length).toBeGreaterThan(30);
    const result = truncateKitName(longName);
    expect(result).toBe(`${longName.slice(0, 30)}…`);
    // The ellipsis is not counted toward the 30-character limit.
    expect(result.slice(0, 30)).toBe(longName.slice(0, 30));
    expect(result.endsWith('…')).toBe(true);
  });

  test('a missing or empty name yields an empty string', () => {
    expect(truncateKitName(undefined)).toBe('');
    expect(truncateKitName('')).toBe('');
  });

  test('honors a custom max', () => {
    expect(truncateKitName('abcdef', 3)).toBe('abc…');
    expect(truncateKitName('abc', 3)).toBe('abc');
  });
});

// export async function createFontAwesomeScriptElement(getUrlText: UrlTextFetcher, pro: boolean, version: string, baseUrl: string, kitToken: string | undefined): Promise<HTMLElement> {
describe('createFontAwesomeScriptElement', () => {
  const getUrlText = jest.fn(() => Promise.resolve('foobar'));
  const baseUrl = 'https://example.com';

  beforeEach(() => {
    getUrlText.mockClear();
  });

  test('basic pro kit', async () => {
    const pro = true;
    const version = '5.0.0';
    const kitToken = 'deadbeef00';

    const script = await createFontAwesomeScriptElement(getUrlText, pro, version, baseUrl, kitToken);

    expect(script.tagName).toEqual('SCRIPT');
    expect(script.innerText).toEqual('foobar');
    expect(getUrlText).toHaveBeenCalledWith('https://example.com/releases/v5.0.0/js/pro.min.js?token=deadbeef00');
  });

  test('basic free cdn', async () => {
    const pro = false;
    const version = '5.0.0';
    const kitToken = undefined;

    const script = await createFontAwesomeScriptElement(getUrlText, pro, version, baseUrl, kitToken);

    expect(script.tagName).toEqual('SCRIPT');
    expect(script.innerText).toEqual('foobar');
    expect(getUrlText).toHaveBeenCalledWith('https://example.com/releases/v5.0.0/js/all.js');
  });

  describe('negatives', () => {
    const originalConsoleError = console.error;

    beforeEach(() => {
      console.error = jest.fn();
    });

    afterEach(() => {
      console.error = originalConsoleError;
    });

    test('throws when getUrlText rejects', async () => {
      const pro = false;
      const version = '5.0.0';
      const kitToken = undefined;
      const getUrlText = jest.fn(() => Promise.reject('fake rejection'));

      return expect(createFontAwesomeScriptElement(getUrlText, pro, version, baseUrl, kitToken)).rejects.toThrow('fake rejection');
    });
  });
});
