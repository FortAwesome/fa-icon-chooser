# my-component



<!-- Auto Generated Below -->


## Properties

| Property      | Attribute   | Description                                                                                                                                                               | Type                                 | Default     |
| ------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------- |
| `handleQuery` | --          |                                                                                                                                                                           | `(document: string) => Promise<any>` | `undefined` |
| `kitToken`    | `kit-token` | A kit token identifying a kit in which to find icons. Takes precedence over the version prop if provided: the version associated with the kit will be used for searching. | `string`                             | `undefined` |
| `pro`         | `pro`       | Whether pro icons should be enabled.                                                                                                                                      | `boolean`                            | `undefined` |
| `version`     | `version`   | Font Awesome version in which to find icons.                                                                                                                              | `string`                             | `undefined` |


## Events

| Event    | Description | Type                             |
| -------- | ----------- | -------------------------------- |
| `finish` |             | `CustomEvent<IconChooserResult>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
