import { h } from '@stencil/core';
import { Fragment } from './utils';
import { truncateKitName } from './utils';

// Parameters that personalize the default copy. In kit mode the component passes the
// kit's token and name; in non-kit mode it passes nothing (or an empty object), and
// every entry falls back to the library-wide default copy.
export interface SlotDefaultsParams {
  kitToken?: string;
  name?: string;
}

// The search-field placeholder never varies with kit token or name, so it's hoisted to a
// module-level constant. The component's render reads it directly (avoiding a full
// slotDefaults() rebuild per render), and slotDefaults() reuses it for the slot map.
export const SEARCH_FIELD_PLACEHOLDER_DEFAULT = 'Find icons by name, category, or keyword';

// slotDefaults is a generator: given the (optional) kit token and name, it returns the
// map of default slot content. In kit mode (a truthy kitToken) the search-status line,
// the start-view heading, and the start-view detail are personalized with the kit's
// name (truncated to 30 chars + ellipsis) and token; every other slot — and all slots
// when no kitToken is supplied — keeps its current library-wide copy. Invoked with no
// argument, an empty object, or an empty kitToken, it returns today's copy verbatim.
export function slotDefaults(params: SlotDefaultsParams = {}) {
  const { kitToken, name } = params;
  const inKitMode = !!kitToken;
  const truncatedName = truncateKitName(name);

  const slots = {};

  slots['fatal-error-heading'] = 'Well, this is awkward...';

  slots['fatal-error-detail'] = 'Something has gone horribly wrong. Check the console for additional error information.';

  slots['start-view-heading'] = inKitMode
    ? `Add Icons from Your Font Awesome ${truncatedName} Kit`
    : "Font Awesome is the web's most popular icon set, with tons of icons in a variety of styles.";

  slots['start-view-detail'] = inKitMode ? (
    "Search your Kit's icons or browse them by style. Need to add or remove icons? Head to fontawesome.com/kits to update your Kit."
  ) : (
    <Fragment>
      Not sure where to start? Here are some favorites, or try a search for <strong>spinners</strong>, <strong>shopping</strong>, <strong>food</strong>, or{' '}
      <strong>whatever you're looking for</strong>.
    </Fragment>
  );

  slots['initial-loading-view-heading'] = 'Fetching icons';

  slots['initial-loading-view-detail'] = 'When this thing gets up to 88 mph...';

  slots['search-field-label-free'] = 'Search Font Awesome Free Icons in Version';

  slots['search-field-label-pro'] = 'Search Font Awesome Pro Icons in Version';

  slots['search-field-placeholder'] = SEARCH_FIELD_PLACEHOLDER_DEFAULT;

  // In kit mode both the free and pro search-status lines describe the kit itself
  // (name + token), independent of the license; the resolved version is appended by the
  // component's render after this slot.
  const kitSearchingCopy = `You're searching the icons in your ${truncatedName} Kit (${kitToken}) set to Font Awesome Version`;

  slots['searching-free'] = inKitMode ? kitSearchingCopy : "You're searching Font Awesome Free icons in version";

  slots['searching-pro'] = inKitMode ? kitSearchingCopy : "You're searching Font Awesome Pro icons in version";

  slots['kit-has-no-uploaded-icons'] = 'This kit contains no uploaded icons.';

  slots['no-search-results-heading'] = "Sorry, we couldn't find anything for that.";

  slots['no-search-results-detail'] = 'You might try a different search...';

  slots['suggest-icon-upload'] = (
    <Fragment>
      Or{' '}
      <a href="https://fontawesome.com/v5.15/how-to-use/on-the-web/using-kits/uploading-icons" target="_blank">
        upload your own icon
      </a>{' '}
      to a Pro Kit!
    </Fragment>
  );

  slots['get-fontawesome-pro'] = (
    <Fragment>
      Or{' '}
      <a href="https://fontawesome.com/" target="_blank">
        use Font Awesome Pro
      </a>{' '}
      for more icons and styles!
    </Fragment>
  );

  return slots;
}
