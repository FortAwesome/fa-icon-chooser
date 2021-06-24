# my-component



<!-- Auto Generated Below -->


## Properties

| Property      | Attribute   | Description                                                                                                                                                                                                              | Type                                 | Default     |
| ------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ | ----------- |
| `cdnUrl`      | `cdn-url`   | A URL for loading Font Awesome within the icon chooser from the Font Awesome Free or Pro CDN, instead of a kit.  If a kitToken is provided, kit loading will be preferred over this.                                     | `string`                             | `undefined` |
| `handleQuery` | --          |                                                                                                                                                                                                                          | `(document: string) => Promise<any>` | `undefined` |
| `integrity`   | `integrity` | Optional CDN integrity attribute. When set the crossorigin="anonymous" attribute will also be added to the <script> or <link> tag that loads Font Awesome from the CDN, causing that resource's integrity to be checked. | `string`                             | `undefined` |
| `kitToken`    | `kit-token` | A kit token identifying a kit in which to find icons. Takes precedence over the version prop if provided: the version associated with the kit will be used for searching.                                                | `string`                             | `undefined` |
| `pro`         | `pro`       | Whether pro icons should be enabled.                                                                                                                                                                                     | `boolean`                            | `undefined` |
| `version`     | `version`   | Font Awesome version in which to find icons.                                                                                                                                                                             | `string`                             | `undefined` |


## Events

| Event    | Description | Type                             |
| -------- | ----------- | -------------------------------- |
| `finish` |             | `CustomEvent<IconChooserResult>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
