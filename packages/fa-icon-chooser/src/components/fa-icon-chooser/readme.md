# fa-icon-chooser

<!-- Auto Generated Below -->

## Properties

| Property                 | Attribute                  | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Type                                                                       | Default     |
| ------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------- |
| `_assetsBaseUrl`         | `_assets-base-url`         | For internal use when testing. This overrides the base URL to use for fetching assets from a Kit. Under normal circumstances, this should not be set. The default values will be set appropriately using pre-configured official CDN URLs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `string`                                                                   | `undefined` |
| `getUrlText`             | `get-url-text`             | Callback function that returns the text body of a response that corresponds to an HTTP GET request for the given URL. For example, it would be the result of [Response.text()](https://developer.mozilla.org/en-US/docs/Web/API/Response/text).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `(url: string) => Promise<string>`                                         | `undefined` |
| `handleQuery`            | `handle-query`             | Required callback function which is responsible for taking a given GraphQL query document and returns a Promise that resolves to a JavaScript object corresponding to the body of the associated network request, same as what would be produced by [Response.json()](https://developer.mozilla.org/en-US/docs/Web/API/Response/json). The query document is compliant with the GraphQL API at [api.fontawesome.com](https://fontawesome.com/v5.15/how-to-use/graphql-api/intro/getting-started). The implementation is responsible for handling any authorization that may be necessary to fulfill the request. For example, any time a kit is used to drive the Icon Chooser, it will be necessary to authorize GraphQL API requests sent to api.fontawesome.com with the [`kits_read` scope](https://fontawesome.com/v5.15/how-to-use/graphql-api/auth/scopes). | `(document: string, variables?: object, options?: object) => Promise<any>` | `undefined` |
| `kitToken`               | `kit-token`                | A kit token identifying a kit in which to find icons. Takes precedent over version prop if both are present.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `string`                                                                   | `undefined` |
| `searchInputPlaceholder` | `search-input-placeholder` | Placeholder text for search form. Use this to provide translatable text.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `string`                                                                   | `undefined` |
| `version`                | `version`                  | Version to use for finding and loading icons when kitToken is not provided. Must be a valid semantic version, as parsed by the [semver NPM](https://www.npmjs.com/package/semver), like 5.5.13 or 6.0.0-beta1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `string`                                                                   | `undefined` |

## Events

| Event    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Type                                        |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `finish` | Clients of the Icon Chooser should listen for this event in order to handle the result of the user's interaction. The emitted `IconChooserResult` will not include SVG data (as an `IconDefinition`) when prohibited by the client's license. License terms for SVG icon data emitted are governed by the terms on the Font Awesome [plans page](https://fontawesome.com/plans), which are elaborated on the Font Awesome [support page](https://fontawesome.com/support). | `CustomEvent<IconDefinition \| IconLookup>` |

## Slots

| Slot                             | Description                                                         |
| -------------------------------- | ------------------------------------------------------------------- |
| `"fatal-error-detail"`           | details for fatal error message                                     |
| `"fatal-error-heading"`          | heading for fatal error message                                     |
| `"get-fontawesome-pro"`          | message about getting Font Awesome Pro with link to fontawesome.com |
| `"initial-loading-view-detail"`  | detail for initial loading view                                     |
| `"initial-loading-view-heading"` | heading for initial loading view                                    |
| `"kit-has-no-uploaded-icons"`    | message about a kit having no icon uploads                          |
| `"no-search-results-detail"`     | no seach results message detail                                     |
| `"no-search-results-heading"`    | no search results message heading                                   |
| `"search-field-label-free"`      | Search Font Awesome Free Icons                                      |
| `"search-field-label-pro"`       | Search Font Awesome Pro Icons                                       |
| `"search-field-placeholder"`     | search field placeholder                                            |
| `"searching-free"`               | Searching Free                                                      |
| `"searching-pro"`                | Searching Pro                                                       |
| `"start-view-detail"`            | detail for message on default view before search                    |
| `"start-view-heading"`           | heading for message on default view before search                   |
| `"suggest-icon-upload"`          | message suggesting to try uploading a custom icon to a kit          |

## Dependencies

### Depends on

- [fa-icon](../fa-icon)

### Graph

```mermaid
graph TD;
  fa-icon-chooser --> fa-icon
  style fa-icon-chooser fill:#f9f,stroke:#333,stroke-width:4px
```

---

_Built with [StencilJS](https://stenciljs.com/)_
