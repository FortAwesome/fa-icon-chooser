// Shared GraphQL response fixtures for kit subset-aware search & showcase tests.
// Modeled on specs/001-kit-subset-search/contracts/*.graphql.

// A Pro kit with several official family-styles, a showcase cache key, a subset
// family-style list (Kit.familyStylesPaginated, carrying family/style/prefix), and two
// custom uploads (one single-path -> fak, one duotone -> fakd).
export const kitMetadataResponse = {
  data: {
    me: {
      kit: {
        kitRevision: 7,
        showcaseCacheKey: 'kit:fake-kit-token:rev7',
        familyStylesPaginated: {
          page: 1,
          pageSize: 50,
          totalFamilyStyleCount: 3,
          totalPageCount: 1,
          familyStyles: [
            { familyStyle: { family: 'classic', style: 'solid', prefix: 'fas' } },
            { familyStyle: { family: 'classic', style: 'regular', prefix: 'far' } },
            { familyStyle: { family: 'classic', style: 'brands', prefix: 'fab' } },
          ],
        },
        version: '7.0.0',
        technologySelected: 'svg',
        licenseSelected: 'pro',
        name: 'test-kit',
        permits: {
          embedProSvg: [
            { prefix: 'fas', family: 'classic' },
            { prefix: 'far', family: 'classic' },
            { prefix: 'fab', family: 'classic' },
          ],
        },
        release: {
          version: '7.0.0',
        },
        iconUploads: [
          { name: 'my-logo', unicode: 0xe000, version: 1, width: '512', height: '512', pathData: ['M1 1 h1 z'] },
          { name: 'my-duotone-mark', unicode: 0xe001, version: 1, width: '512', height: '512', pathData: ['M2 2 h2 z', 'M3 3 h3 z'] },
        ],
      },
    },
  },
};

// A Kit.searchKit OFFICIAL response: `icons` is a union list of IconWithVariants,
// each carrying one or more concrete `variants`.
export const searchKitOfficialResponse = {
  data: {
    me: {
      kit: {
        searchKit: {
          page: 1,
          pageSize: 50,
          totalIconCount: 2,
          totalPageCount: 1,
          icons: [
            {
              __typename: 'IconWithVariants',
              name: 'arrow-right',
              label: 'Arrow Right',
              unicodeHex: 'f061',
              variants: [
                { name: 'arrow-right', unicodeHex: 'f061', familyStyle: { family: 'classic', style: 'solid', prefix: 'fas' } },
                { name: 'arrow-right', unicodeHex: 'f061', familyStyle: { family: 'classic', style: 'regular', prefix: 'far' } },
              ],
            },
            {
              __typename: 'IconWithVariants',
              name: 'arrow-left',
              label: 'Arrow Left',
              unicodeHex: 'f060',
              variants: [{ name: 'arrow-left', unicodeHex: 'f060', familyStyle: { family: 'classic', style: 'solid', prefix: 'fas' } }],
            },
          ],
        },
      },
    },
  },
};

// A Kit.searchKit CUSTOM response: `icons` is a union list of IconUpload members
// (uploaded custom icons), which carry no family-style.
export const searchKitCustomResponse = {
  data: {
    me: {
      kit: {
        searchKit: {
          page: 1,
          pageSize: 50,
          totalIconCount: 1,
          totalPageCount: 1,
          icons: [{ __typename: 'IconUpload', name: 'my-logo', unicodeHex: 'e000', width: '512', height: '512', pathData: ['M1 1 h1 z'] }],
        },
      },
    },
  },
};

// An empty Kit.searchKit page (no matches).
export const searchKitEmptyResponse = {
  data: { me: { kit: { searchKit: { page: 1, pageSize: 50, totalIconCount: 0, totalPageCount: 0, icons: [] } } } },
};

// Build a Kit.showcaseIcons response for a given family-style prefix.
export function showcaseIconsResponse(prefix: string, names: Array<string> = ['house', 'gear', 'heart']) {
  return {
    data: {
      me: {
        kit: {
          showcaseIcons: {
            page: 1,
            pageSize: 80,
            totalIconVariantCount: names.length,
            totalPageCount: 1,
            iconVariants: names.map((name, i) => ({
              name,
              unicodeHex: (0xf000 + i).toString(16),
              familyStyle: { family: 'classic', style: 'solid', prefix },
            })),
          },
        },
      },
    },
  };
}

// An empty Kit.showcaseIcons page (a family-style the kit contains but with no
// showcase icons) — a legitimate empty result, not an error.
export const showcaseIconsEmptyResponse = {
  data: { me: { kit: { showcaseIcons: { page: 1, pageSize: 80, totalIconVariantCount: 0, totalPageCount: 0, iconVariants: [] } } } },
};
