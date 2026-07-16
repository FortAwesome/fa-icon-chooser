import { slotDefaults } from './slots';
import { truncateKitName } from './utils';

// The non-kit (library-wide) copy that must remain unchanged when slotDefaults is
// invoked with no params / an empty object / an empty kitToken.
const ORIGINAL_START_VIEW_HEADING = "Font Awesome is the web's most popular icon set, with tons of icons in a variety of styles.";
const ORIGINAL_SEARCHING_FREE = "You're searching Font Awesome Free icons in version";
const ORIGINAL_SEARCHING_PRO = "You're searching Font Awesome Pro icons in version";

describe('slotDefaults', () => {
  describe('non-kit mode (no/empty params)', () => {
    test.each([[undefined], [{}], [{ kitToken: '' }], [{ kitToken: '', name: 'Ignored' }]])("returns today's copy for %p", params => {
      const slots = slotDefaults(params as any);
      expect(slots['start-view-heading']).toBe(ORIGINAL_START_VIEW_HEADING);
      expect(slots['searching-free']).toBe(ORIGINAL_SEARCHING_FREE);
      expect(slots['searching-pro']).toBe(ORIGINAL_SEARCHING_PRO);
      // start-view-detail is JSX in non-kit mode (not a plain string).
      expect(typeof slots['start-view-detail']).not.toBe('string');
    });

    test('does not throw and yields the static placeholder', () => {
      expect(() => slotDefaults()).not.toThrow();
      expect(slotDefaults()['search-field-placeholder']).toBe('Find icons by name, category, or keyword');
    });
  });

  describe('kit mode (kitToken present)', () => {
    const kitToken = 'abc123';
    const name = 'Marketing Site';
    const slots = slotDefaults({ kitToken, name });

    test('search-status lines name the kit (same string for free and pro)', () => {
      const expected = `You're searching the icons in your ${name} Kit (${kitToken}) set to Font Awesome Version`;
      expect(slots['searching-free']).toBe(expected);
      expect(slots['searching-pro']).toBe(expected);
    });

    test('start-view-heading names the kit', () => {
      expect(slots['start-view-heading']).toBe(`Add Icons from Your Font Awesome ${name} Kit`);
    });

    test('start-view-detail points to fontawesome.com/kits', () => {
      expect(slots['start-view-detail']).toBe("Search your Kit's icons or browse them by style. Need to add or remove icons? Head to fontawesome.com/kits to update your Kit.");
    });

    test('a name longer than 30 characters is truncated with an ellipsis', () => {
      const longName = 'This Kit Name Is Definitely Longer Than Thirty Characters';
      const truncated = truncateKitName(longName);
      const kitSlots = slotDefaults({ kitToken, name: longName });
      expect(kitSlots['start-view-heading']).toBe(`Add Icons from Your Font Awesome ${truncated} Kit`);
      expect(kitSlots['searching-pro']).toBe(`You're searching the icons in your ${truncated} Kit (${kitToken}) set to Font Awesome Version`);
    });

    test('a missing name still yields valid copy (empty name portion, token retained)', () => {
      const kitSlots = slotDefaults({ kitToken });
      expect(kitSlots['start-view-heading']).toBe('Add Icons from Your Font Awesome  Kit');
      expect(kitSlots['searching-pro']).toBe(`You're searching the icons in your  Kit (${kitToken}) set to Font Awesome Version`);
    });
  });

  describe('parity between kit and non-kit', () => {
    const nonKit = slotDefaults({});
    const kit = slotDefaults({ kitToken: 'abc123', name: 'Marketing Site' });
    const personalized = ['searching-free', 'searching-pro', 'start-view-heading', 'start-view-detail'];

    test('both invocations expose the same set of slot names', () => {
      expect(Object.keys(kit).sort()).toEqual(Object.keys(nonKit).sort());
    });

    test('every non-personalized slot is identical between kit and non-kit', () => {
      for (const slotName of Object.keys(nonKit)) {
        if (personalized.includes(slotName)) {
          continue;
        }
        expect(kit[slotName]).toEqual(nonKit[slotName]);
      }
    });
  });
});
