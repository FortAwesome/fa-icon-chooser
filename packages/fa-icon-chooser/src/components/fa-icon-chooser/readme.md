# fa-icon-chooser

## Usage

Add it to your JavaScript bundle:

```
npm install --save @fortawesome/fa-icon-chooser
```

After the resulting JavaScript bundle has been loaded in the DOM, you can
mount an `fa-icon-chooser` in the DOM. Suppose your HTML has a container `div`:

```
<div id="fa-icon-chooser-container"></div>
```

Then you could write JavaScript like this:

```js
function handleQuery(query) {
  // some function that handles queries
}

function getUrlText(url) {
  // some function that handles GET requests
}

function handleResult(event) {
  const result = event && event.detail

  if(result.iconName) {
    console.log(`<i class"${result.prefix} ${result.iconName}">`)
  } else if(...) {
    // handle other kinds of results
  }
}

window.addEventListener('DOMContentLoaded', (event) => {
  const container = document.querySelector('#fa-icon-chooser-container')
  const el = document.createElement('fa-icon-chooser')
  el.handleQuery = handleQuery
  el.getUrlText = getUrlText
  el.addEventListener('finish', handleResult)
  container.appendChild(el)
})
```

See the API Reference below for details about what you'd need to implement in
`handleQuery()`, `getUrlText()`, and `handleResult()`.

You can also look at some example implementations in this repo's [development runtime code](../../src/dev/runtime.js).

<!-- Auto Generated Below -->

## Properties

| Property      | Attribute   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Type                                 | Default     |
| ------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ | ----------- |
| `getUrlText`  | --          | Callback function that returns the text body of a response that corresponds to an HTTP GET request for the given URL. For example, it would be the result of [Response.text()](https://developer.mozilla.org/en-US/docs/Web/API/Response/text).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `(url: string) => Promise<string>`   | `undefined` |
| `handleQuery` | --          | Required callback function which is responsible for taking a given GraphQL query document and returns a Promise that resolves to a JavaScript object corresponding to the body of the associated network request, same as what would be produced by [Response.json()](https://developer.mozilla.org/en-US/docs/Web/API/Response/json). The query document is compliant with the GraphQL API at [api.fontawesome.com](https://fontawesome.com/v5.15/how-to-use/graphql-api/intro/getting-started). The implementation is responsible for handling any authorization that may be necessary to fulfill the request. For example, any time a kit is used to drive the Icon Chooser, it will be necessary to authorize GraphQL API requests sent to api.fontawesome.com with the [`kits_read` scope](https://fontawesome.com/v5.15/how-to-use/graphql-api/auth/scopes). | `(document: string) => Promise<any>` | `undefined` |
| `kitToken`    | `kit-token` | A kit token identifying a kit in which to find icons. Takes precedent over version prop if both are present.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `string`                             | `undefined` |
| `version`     | `version`   | Version to use for finding and loading icons when kitToken is not provided. Must be a valid semantic version, as parsed by the [semver NPM](https://www.npmjs.com/package/semver), like 5.5.13 or 6.0.0-beta1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `string`                             | `undefined` |

## Events

| Event    | Description                                                                                                       | Type                           |
| -------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `finish` | Clients of the Icon Chooser should listen for this event in order to handle the result of the user's interaction. | `CustomEvent<Element \| Icon>` |

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
