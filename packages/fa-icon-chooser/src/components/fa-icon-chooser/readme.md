# my-component



<!-- Auto Generated Below -->


## Properties

| Property      | Attribute   | Description                                                                                                                                                                                                                                     | Type                                 | Default     |
| ------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------- |
| `getUrlText`  | --          | Callback function that returns the text body of a response that corresponds to an HTTP GET request for the given URL. For example, it would be the result of [Response.text()](https://developer.mozilla.org/en-US/docs/Web/API/Response/text). | `(url: string) => Promise<string>`   | `undefined` |
| `handleQuery` | --          |                                                                                                                                                                                                                                                 | `(document: string) => Promise<any>` | `undefined` |
| `kitToken`    | `kit-token` | A kit token identifying a kit in which to find icons. Takes precedent over version prop if both are present.                                                                                                                                    | `string`                             | `undefined` |
| `version`     | `version`   | Version to use for finding and loading icons when kitToken is not provided.                                                                                                                                                                     | `string`                             | `undefined` |


## Events

| Event    | Description | Type                           |
| -------- | ----------- | ------------------------------ |
| `finish` |             | `CustomEvent<Element \| Icon>` |


## Dependencies

### Depends on

- [fa-icon](../fa-icon)

### Graph
```mermaid
graph TD;
  fa-icon-chooser --> fa-icon
  style fa-icon-chooser fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
