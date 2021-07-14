import { parseSvgText, IconChooserResult, isValidSemver, createFontAwesomeScriptElement } from './utils';
import { IconLookup } from '@fortawesome/fontawesome-common-types';

describe('parseSvgText', () => {
  test('duotone double path no classes', () => {
    const result = parseSvgText('<svg viewBox="0 0 10 10"><path d="abc"></path><path d="xyz"></path></svg>');
    expect(result).toEqual([10, 10, [], null, ['abc', 'xyz']]);
  });
  test('duotone double path with classes, primary first', () => {
    const result = parseSvgText('<svg viewBox="0 0 10 10"><path class="fa-primary" d="abc"></path><path class="fa-secondary" d="xyz"></path></svg>');
    expect(result).toEqual([10, 10, [], null, ['abc', 'xyz']]);
  });
  test('duotone double path with classes, secondary first', () => {
    const result = parseSvgText('<svg viewBox="0 0 10 10"><path class="fa-secondary" d="xyz"></path><path class="fa-primary" d="abc"></path></svg>');
    expect(result).toEqual([10, 10, [], null, ['abc', 'xyz']]);
  });
  test('duotone single path only primary', () => {
    const result = parseSvgText('<svg viewBox="0 0 10 10"><path class="fa-primary" d="abc"></path></svg>');
    expect(result).toEqual([10, 10, [], null, ['abc', '']]);
  });
  test('duotone single path only secondary', () => {
    const result = parseSvgText('<svg viewBox="0 0 10 10"><path class="fa-secondary" d="xyz"></path></svg>');
    expect(result).toEqual([10, 10, [], null, ['', 'xyz']]);
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
