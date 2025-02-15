import { h } from '@stencil/core';
import { Fragment } from './utils';

export const slotDefaults = {};

slotDefaults['fatal-error-heading'] = 'Well, this is awkward...';

slotDefaults['fatal-error-detail'] = 'Something has gone horribly wrong. Check the console for additional error information.';

slotDefaults['start-view-heading'] = "Font Awesome is the web's most popular icon set, with tons of icons in a variety of styles.";

slotDefaults['start-view-detail'] = (
  <Fragment>
    Not sure where to start? Here are some favorites, or try a search for <strong>spinners</strong>, <strong>shopping</strong>, <strong>food</strong>, or{' '}
    <strong>whatever you're looking for</strong>.
  </Fragment>
);

slotDefaults['initial-loading-view-heading'] = 'Fetching icons';

slotDefaults['initial-loading-view-detail'] = 'When this thing gets up to 88 mph...';

slotDefaults['search-field-label-free'] = 'Search Font Awesome Free Icons in Version';

slotDefaults['search-field-label-pro'] = 'Search Font Awesome Pro Icons in Version';

slotDefaults['search-field-placeholder'] = 'Find icons by name, category, or keyword';

slotDefaults['searching-free'] = "You're searching Font Awesome Free icons in version";

slotDefaults['searching-pro'] = "You're searching Font Awesome Pro icons in version";

slotDefaults['kit-has-no-uploaded-icons'] = 'This kit contains no uploaded icons.';

slotDefaults['no-search-results-heading'] = "Sorry, we couldn't find anything for that.";

slotDefaults['no-search-results-detail'] = 'You might try a different search...';

slotDefaults['suggest-icon-upload'] = (
  <Fragment>
    Or{' '}
    <a href="https://fontawesome.com/v5.15/how-to-use/on-the-web/using-kits/uploading-icons" target="_blank">
      upload your own icon
    </a>{' '}
    to a Pro Kit!
  </Fragment>
);

slotDefaults['get-fontawesome-pro'] = (
  <Fragment>
    Or{' '}
    <a href="https://fontawesome.com/" target="_blank">
      use Font Awesome Pro
    </a>{' '}
    for more icons and styles!
  </Fragment>
);
