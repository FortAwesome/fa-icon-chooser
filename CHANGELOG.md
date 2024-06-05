# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

---
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
  (See also Breaking Changes)

### Breaking Changes

- The icon chooser's queries now use variables, instead of interpolating all values
  into a single query document string. Thus, any `QueryHandler` callback must be updated
  to handle the query variables.

  Suggestion:

  ```javascript
  async function handleQuery(query, variables) {
    const headers = buildHeaders()
    const url = getApiUrl()
    const body = JSON.stringify({query, variables})

    return fetch(url, {
      method: "POST",
      headers,
      body
    })
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