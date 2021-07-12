import { h } from '@stencil/core';
import { Fragment } from './utils';

export const slotDefaults = {}

slotDefaults['fatal-error-heading'] = 'Well, this is awkward...';

slotDefaults['fatal-error-detail'] = 'Something has gone horribly wrong. Check the console for additional error information.';

slotDefaults['start-view-heading'] = "Font Awesome is the web's most popular icon set, with tons of icons in a variety of styles."

slotDefaults['start-view-detail'] = <>
  Not sure where to start? Here are some favorites, or try a search for <strong>spinners</strong>, <strong>animals</strong>, <strong>food</strong>, or{' '}
  <strong>whatever you're looking for</strong>.
</>;

slotDefaults['initial-loading-view-heading'] = 'Fetching icons'

slotDefaults['initial-loading-view-detail'] = 'When this thing gets up to 88 mph...'
