import { h } from '@stencil/core';
import { Fragment } from './utils';

export const slotDefaults = {}

slotDefaults['fatal-error-heading'] = 'Well, this is awkward...';

slotDefaults['fatal-error-detail'] = 'Something has gone horribly wrong. Check the console for additional error information.';

slotDefaults['start-view-heading'] = "Font Awesome is the web's most popular icon set, with tons of icons in a variety of styles.";

slotDefaults['start-view-detail'] = <>
  Not sure where to start? Here are some favorites, or try a search for <strong>spinners</strong>, <strong>animals</strong>, <strong>food</strong>, or{' '}
  <strong>whatever you're looking for</strong>.
</>;

slotDefaults['initial-loading-view-heading'] = 'Fetching icons';

slotDefaults['initial-loading-view-detail'] = 'When this thing gets up to 88 mph...';

slotDefaults['search-field-label'] = 'Search Font Awesome Icons';

slotDefaults['search-field-placeholder'] = 'Search for icons by name, category, or keyword';

slotDefaults['searching'] = 'Searching';

slotDefaults['light-requires-pro'] = 'You need to use a Pro kit to get Light icons.';

slotDefaults['thin-requires-pro'] = 'You need to use a Pro kit with Version 6 to get Thin icons.';

slotDefaults['duotone-requires-pro'] = 'You need to use a Pro kit with Version 5.10 or later to get Duotone icons.'

slotDefaults['custom-requires-pro'] = 'You need to use a Pro kit to get Custom icons.'

slotDefaults['kit-has-no-uploaded-icons'] = 'This kit contains no uploaded icons.'

slotDefaults['no-search-results-heading'] = "Sorry, we couldn't find anything for that."

slotDefaults['no-search-results-detail'] = 'You might try a different search...'

slotDefaults['get-fontawesome-pro'] = <>
  Or{' '}
  <a href="https://fontawesome.com/" target="_blank">
    get Font Awesome Pro
  </a>{' '}
  and upload your own icon!
</>

slotDefaults['solid-style-filter-sr-message'] = 'Show solid style icons'

slotDefaults['regular-style-filter-sr-message'] = 'Show regular style icons'

slotDefaults['light-style-filter-sr-message'] = 'Show light style icons'

slotDefaults['thin-style-filter-sr-message'] = 'Show thin style icons'

slotDefaults['duotone-style-filter-sr-message'] = 'Show duotone style icons'

slotDefaults['brands-style-filter-sr-message'] = 'Show brands style icons'

slotDefaults['uploaded-style-filter-sr-message'] = 'Show your uploaded icons'
