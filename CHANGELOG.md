# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

---
## [Unreleased]

### Added

- Kit subset-aware search and showcase: when the Icon Chooser is used in kit mode (a `kit-token` is provided), icon search now queries the kit's subset via the `Kit.searchKit` field (using `searchMode: CUSTOM` for the kit's custom-upload family-styles `fak`/`fakd`, and `OFFICIAL` otherwise), and the opening view presents a curated, subset-aware showcase via the kit's `Kit.showcaseIcons` field instead of the library-wide default set. The chooser's available family-styles are limited to the kit's subset (`Kit.familyStyles`), and the default-selected family-style is always one the subset contains. Showcases are loaded lazily per family-style and cached using the kit-provided `Kit.showcaseCacheKey`. Non-kit (version-only) mode behavior is unchanged.
- Kit-branded copy in kit mode: the search-status line, the start-view heading, and the start-view detail now identify the kit by name and token. The status line reads "You're searching the icons in your `<kit name>` Kit (`<kit token>`) set to Font Awesome Version …", the heading reads "Add Icons from Your Font Awesome `<kit name>` Kit", and the detail points to fontawesome.com/kits. The kit name is truncated to 30 characters (with an ellipsis) for display. These strings remain overridable via their existing named slots, and non-kit (version-only) copy is unchanged.

## [0.10.2](https://github.com/FortAwesome/fa-icon-chooser/releases/tag/0.10.2) - 2026-05-05

### Changed

- Update lodash to address security vulnerabilities (though no vulnerable lodash functions were actually used by this app's production bundle)
- Change lodash imports to be more specific to ensure that the production bundle includes only the lodash functions that are actually used by this app.

## [0.10.1](https://github.com/FortAwesome/fa-icon-chooser/releases/tag/0.10.1) - 2026-05-05

### Changed

- fix includeFamilyStyle filter feature to reconcile the currently selected familyStyle with available familyStyles, after applying all filters.

## [0.10.0](https://github.com/FortAwesome/fa-icon-chooser/releases/tag/0.10.0) - 2026-04-01

### Changed

- added an includeFamilyStyle filter, which can be used to further restrict the familyStyles presented in the Icon Chooser
- adds family and style as properties to the IconChooserResult

## [0.9.1](https://github.com/FortAwesome/fa-icon-chooser/releases/tag/0.9.1) - 2025-07-22

### Changed

- Updated api urls

## [0.9.0](https://github.com/FortAwesome/fa-icon-chooser/releases/tag/0.9.0) - 2025-07-22

### Changed

- Font Awesome Pro+ icons are now available with an active Pro+ subscription.

- Pro Lite users with uploaded icons in their kits will no longer see the SVG data. This update reflects the intended behavior, as that access was never meant to be included with the Pro Lite plan.

## [0.8.0](https://github.com/FortAwesome/fa-icon-chooser/releases/tag/0.8.0) - 2025-02-14

### Changed

- The `IconChooserResult` object emitted by the icon chooser's selection event may now include
  not only an `IconLookup` (the `name` and `prefix` of an icon in a particular familyStyle),
  but also an entire [`IconDefinition`](https://docs.fontawesome.com/apis/javascript/methods#findicondefinitionparams) (including the SVG path data).
  This allows for embedding SVG icons directly in content.

  Font Awesome Pro icons are subject to the terms of the [Font Awesome Pro license](https://fontawesome.com/license).
  This license is restricted for some plan types, such as Pro Lite. At the time of this release,
  the Pro Lite plan license does not permit embedding of Pro SVGs, except by the official
  Font Awesome WordPress plugin. See the [plans](https://fontawesome.com/plans) page and [support](https://fontawesome.com/support)
  page for details.

  The `fa-icon-chooser` queries the Font Awesome GraphQL API to determine whether the current user
  has permissions to embed Pro SVGs. If not, then the `IconChooserResult` will include only the
  `IconLookup` object, not the full `IconDefinition` object.

  Thus, a developer using this `fa-icon-chooser` need not write any business logic according to
  the current user's Font Awesome plan type. However, the developer should take care to handle
  either case in its UI. Do not assume that the `IconDefinition` is always present in the
  `IconChooserResult` object.

  Consider showing the user a message like: "Your current Font Awesome plan does not allow embedding SVG icons.
  You can upgrade to enable this feature."

- The `QueryHandler` type of the `handleQuery()` callback function now takes an optional third argument: `options`.
  That `options` object now has a single optional property: `cache`.
  When `cache` is `true`, the results of the `handleQuery()` function may be cached, and a cached
  result may be returned instead of a new query being sent to the GraphQL API.
  This allows the kit metadata query to be cached. A kit's metadata rarely changes, but it must be
  provided each time the icon chooser is mounted. Hence caching it allows for much quicker
  re-opening of the icon chooser after the first time it's opened.

  This `cache` option is not used when searching icons, only when loading the kit's metadata.

### Breaking Changes

- This release includes a major upgrade of `@stencil/core`, the library used to build this web component
  package. The new version of StencilJS requires a minimum version of React >= 17.
  So the `fa-icon-chooser-react` package in this repo now requires React >= 17.

## [0.7.0](https://github.com/FortAwesome/fa-icon-chooser/releases/tag/0.7.0) - 2024-06-05

### Changed

- Family and style selection are now based on drop down selections, and the available
  values are retrieved from the GraphQL API. This removes the hardcoding of familyStyles
  and lets the icon chooser work with all available familyStyles for the active version
  of Font Awesome.
- Several slots for messages to indicate the unavailability of certain familyStyles
  have been removed. They are no longer used, now that the UI only includes in
  the drop down selectors available familyStyle combinations for the active version
  of Font Awesome.

  The following slots have been removed:

  - `light-requires-pro`
  - `thin-requires-pro`
  - `duotone-requires-pro`
  - `sharp-solid-requires-pro`
  - `sharp-regular-requires-pro`
  - `sharp-light-requires-pro`
  - `uploaded-requires-pro`
  - `sharp-solid-style-filter-sr-message`
  - `sharp-regular-style-filter-sr-message`
  - `sharp-light-style-filter-sr-message`
  - `solid-style-filter-sr-message`
  - `regular-style-filter-sr-message`
  - `light-style-filter-sr-message`
  - `thin-style-filter-sr-message`
  - `duotone-style-filter-sr-message`
  - `brands-style-filter-sr-message`
  - `uploaded-style-filter-sr-message`

- The `QueryHandler` type now takes a second optional argument for variables.
  (See also Breaking Changes)o

### Fixed

- Duotone custom icons in kits now work correctly.

### Breaking Changes

- The icon chooser's queries now use variables, instead of interpolating all values
  into a single query document string. Thus, any `QueryHandler` callback must be updated
  to handle the query variables.

  Its type signature is now:

  ```typescript
  export type QueryHandler = (
    document: string,
    variables?: object
  ) => Promise<any>;
  ```

  Suggestion:

  ```javascript
  async function handleQuery(query, variables) {
    const headers = buildHeaders();
    const url = getApiUrl();
    const body = JSON.stringify({ query, variables });

    return fetch(url, {
      method: "POST",
      headers,
      body,
    });
  }
  ```

## [0.6.0](https://github.com/FortAwesome/fa-icon-chooser/releases/tag/0.6.0) - 2023-07-12

### Changed

- Enable React 18 as peer dependency for fa-icon-chooser-react
- No changes to the fa-icon-chooser base package

## [0.5.0](https://github.com/FortAwesome/fa-icon-chooser/releases/tag/0.5.0) - 2023-04-12

### Added

- Support for Sharp Regular and Sharp Light

## [0.4.1](https://github.com/FortAwesome/fa-icon-chooser/releases/tag/0.4.1) - 2022-08-31

### Changed

- Fixed the version of fa-icon-chooser on which fa-icon-chooser-react depends.

## [0.4.0](https://github.com/FortAwesome/fa-icon-chooser/releases/tag/0.4.0) - 2022-08-31

### Added

- Support for Sharp Solid.

## [0.3.0](https://github.com/FortAwesome/fa-icon-chooser/releases/tag/0.3.0) - 2022-01-26

### Changed

- Updated depedencies, especially StencilJS and peerDependencies to allow for React 17.

- Fixed duotone SVG handling. They were rendering correctly, but internally were being handled incorrectly.

- Changed one of the default search result icons.

## [0.1.0](https://github.com/FortAwesome/fa-icon-chooser/releases/tag/0.1.0) - 2021-07-14

### Added

- Initial version