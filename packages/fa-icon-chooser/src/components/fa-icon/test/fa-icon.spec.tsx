import { newSpecPage } from '@stencil/core/testing';
import { FaIcon } from '../fa-icon';

describe('fa-icon', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [FaIcon],
      html: `<fa-icon></fa-icon>`,
    });
    expect(page.root).toEqualHtml(`
      <fa-icon>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </fa-icon>
    `);
  });
});
