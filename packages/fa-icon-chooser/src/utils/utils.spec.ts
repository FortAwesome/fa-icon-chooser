import { parseSvgText, IconChooserResult, isValidSemver, createFontAwesomeScriptElement } from './utils';
import { IconLookup } from '@fortawesome/fontawesome-common-types';

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
    const star: IconLookup = {
      prefix: 'fas',
      iconName: 'star',
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
