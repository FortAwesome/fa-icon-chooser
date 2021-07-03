import { newE2EPage } from '@stencil/core/testing';

describe('fa-icon', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<fa-icon></fa-icon>');

    const element = await page.find('fa-icon');
    expect(element).toHaveClass('hydrated');
  });
});
