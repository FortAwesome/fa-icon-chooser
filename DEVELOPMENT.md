# Development

## Overview

This is a Stencil JS monorepo built according to [the guidlines here](https://stenciljs.com/docs/react#getting-started).

There are currently two packages:
1. the core library under `packages/fa-icon-chooser`
2. the React integration under `packages/fa-icon-chooser-react`

The core library builds assets into the React integration. Each package is deployed
as its own NPM package.

## Separation of Concerns

Your code is the data container that drives the `fa-icon-chooser` and must handle
network requests and must handle any needed authorization. It must configure
the `fa-icon-chooser` using `version` and/or `kitToken` props to run against
a particular version of Font Awesome.

## Development Runtime

`fa-icon-chooser` is a web component with some props that are not scalars, such
as some callback functions. So the way it's added to the DOM is by using
`createElement` and assigning those props before adding the component to the
DOM. (The React integration makes this more idiomatic, since it can handle
non-scalar props.)

The `index.html` that is loaded on `npm run start` pulls in [`runtime.js`](packages/fa-icon-chooser/dev/runtime.js)

`runtime.js` fetches a development-only `local.json` configuration file, which must
exist, and you must create yourself, and it is intentionally `gitignore`'d.

### REQURED: make your own local.json

`local.json` should be created at `packages/fa-icon-chooser/local.json`,
and it has three top-level keys:
1. "head" (optional)
    This allows for simulating the environment in which you might be mounting
    the `fa-icon-chooser`.
    
    For example, suppose your code is a WordPress plugin,
    running in a WordPress environment that would already have Font Awesome loaded
    in the DOM into which you'd be mounting `fa-icon-chooser`. The `head` key
    is where you can declare what `<script>` or `<link>` element should be added
    to the `<head>` of the `document` in order to simulate that environment.

    This would add a `<link>` tag to the `<head>` with attributes according
    to each of its subkeys.

    ```json
    {
      "head": {
        "link": {
          "href": "https://pro.fontawesome.com/releases/v5.15.3/css/all.css",
          "rel": "stylesheet",
          "integrity": "sha384-iKbFRxucmOHIcpWdX9NTZ5WETOPm0Goy0WmfyNcl52qSYtc2Buk0NCe6jU1sWWNB",
          "crossorigin": "anonymous"
        }
      },
      "props": {
        "version": "5.15.3"
      }
    }    
    ```

    Regardless of what version or technology of Font Awesome is loaded in the
    outer DOM (via this `head` key or any other means), _inside_ the `fa-icon-chooser`
    the Font Awesome SVG/JS technology will be used for rendering icons.

1. "props" (required)
    Each subkey under `props` will become a prop assigned to the `fa-icon-chooser`
    component.

    This configuration, for example, sets only the version prop. This would result
    in Font Awesome Free, for this version, being loaded from the Free CDN.

    ```json
    {
      "props": {
        "version": "5.15.3"
      }
    }    
    ```

    This configuration would cause the kit with token `24adf01c2f` to be used.
    The version of Font Awesome that will be searched by the icon chooser will
    be the version for which that kit is configured to use. The icon chooser
    discovers that version by querying the for that kit's metadata from the
    Font Awesome API.

    ```json
    {
      "props": {
        "kit-token": "24adf01c2f"
      },
      "apiToken": "DEADBEEF-0F0F-ABBA-F00D-DEADBEEF0123"
    }
    ```
1. "apiToken" (required when configured to use a kit)
    This must be a real API Token with `kits_read` scope, from the fontawesome.com
    account that owns the kit with the configured kit token.

## Setup

<a name="setup"></a>

Create a `packages/fa-icon-chooser/src/local.json` file with your desired
configuration as above.

```bash
$ cd packages/fa-icon-chooser
$ npm install
$ npm run
```

## React example

There's a `create-react-app`-based example app under `packages/fa-icon-chooser-react/example` that
demonstrates how it might be using it.

## Releasing a new version

<a name="release"></a>

1. Update each `package.json` file:
    - `packages/fa-icon-chooser/package.json` (main component library)
    - `packages/fa-icon-chooser-react/package.json` (react integration library)

    Edit the following keys in each file:

        - Update the `version`
        - Add new contributors to the `contributors` section
1. Update the `CHANGELOG.md`
1. Update the `readme.md` contributors section
1. `git add . && git commit -m 'Release VERSION'`
1. `git push`
1. Create a [new release](https://github.com/FortAwesome/fa-icon-chooser/releases/new) with `CHANGELOG` details