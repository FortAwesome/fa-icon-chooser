import { newSpecPage } from '@stencil/core/testing';
import { FaIcon } from '../fa-icon';
import { faSadTear } from '../../../utils/icons'

async function mountWith(params) {
  const {attrs, icon, iconUpload } = params

  const page = await newSpecPage({
    components: [FaIcon]
  })

  const el = document.createElement('fa-icon')

  for (const attr in attrs) {
    el.setAttribute(attr, attrs[attr])
  }

  if(icon) {
    el.icon = icon
  }

  if(iconUpload) {
    el.iconUpload = iconUpload
  }

  page.body.appendChild(el)
  await page.waitForChanges()

  return page
}

describe('fa-icon', () => {
  it('renders with only icon prop', async () => {
    const page = await mountWith({
      icon: faSadTear
    });

    expect(page.root.innerHTML).toEqual(expect.stringMatching(/<svg .*viewBox="0 0 496 512"/))
  });

  it('renders with only iconUpload', async () => {
    const page = await mountWith({
      iconUpload: {
        name: faSadTear.iconName,
        unicode: 'f00d',
        version: 1,
        width: '123',
        height: '456',
        path: 'M100 100h50v50z'
      }
    });

    expect(page.root.innerHTML).toEqual(expect.stringMatching(/<svg .*viewBox="0 0 123 456".*d="M100 100h50v50z"/))
  });
});
