![Built With Stencil](https://img.shields.io/badge/-Built%20With%20Stencil-16161d.svg?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjIuMSwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCA1MTIgNTEyOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI%2BCjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI%2BCgkuc3Qwe2ZpbGw6I0ZGRkZGRjt9Cjwvc3R5bGU%2BCjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik00MjQuNywzNzMuOWMwLDM3LjYtNTUuMSw2OC42LTkyLjcsNjguNkgxODAuNGMtMzcuOSwwLTkyLjctMzAuNy05Mi43LTY4LjZ2LTMuNmgzMzYuOVYzNzMuOXoiLz4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTQyNC43LDI5Mi4xSDE4MC40Yy0zNy42LDAtOTIuNy0zMS05Mi43LTY4LjZ2LTMuNkgzMzJjMzcuNiwwLDkyLjcsMzEsOTIuNyw2OC42VjI5Mi4xeiIvPgo8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNDI0LjcsMTQxLjdIODcuN3YtMy42YzAtMzcuNiw1NC44LTY4LjYsOTIuNy02OC42SDMzMmMzNy45LDAsOTIuNywzMC43LDkyLjcsNjguNlYxNDEuN3oiLz4KPC9zdmc%2BCg%3D%3D&colorA=16161d&style=flat-square)

# Font Awesome Icon Chooser

A Web Component built with [Stencil](https://stenciljs.com/), for use in other
projects that want to provide a Font Awesome Icon search and discovery experience.

It's powered by the same Algolia search as the [Font Awesome Icon Gallery](https://fontawesome.com/icons).

Used, for example, in the [Font Awesome official WordPress plugin](https://github.com/FortAwesome/wordpress-fontawesome).

Using this component requires front end development directly in JavaScript
and the DOM. It's intended for developers integrating Font Awesome into their apps
and components.

![Font Awesome Icon Chooser Screenshot](/images/screenshot1.png)

## Overview

The Icon Chooser can be configured to work with a Font Awesome Kit, using that
kit's unique token, or without a kit, given just a Font Awesome version number.

In non-kit mode, only Font Awesome Free is available.

When used with a kit, everything is available, according to that kit's configuration.
- Font Awesome Pro
- Font Awesome 6


- Kit Icon Uploads: any icons uploaded to the kit are available in the chooser.

A user configures their own kit on that kit's settings page on fontawesome.com and
generates an API Token that authorizes access to their kit's settings via the GraphQL API.

The user provides that kit token and API token to your code. Your code provides the
kit token as a prop to `fa-icon-chooser`. Your code uses the API Token to get an
[access token from the token endpoint](https://fontawesome.com/v5.15/how-to-use/graphql-api/auth/token-endpoint), and then uses that resulting access token to authorize any
queries in your `handleQuery()` callback function. 

You provide your own implementations of a few different callback functions for
handling queries and the results of the user's interaction with the Icon Chooser.

## Example Interaction
1. User takes some action in your app to insert a Font Awesome Icon, like clicking an "insert icon" buton.
2. Your code mounts this Icon Chooser providing the various required props and listens for the `finish` event to be fired in the DOM.
3. Your code uses the `IconChooserResult` object delivered by that event to render the results of the user's choice.

For example, an `IconChooserResult` might be:
```javascript
{ prefix: "fad", iconName: "alien" }
```

If your code is a React app using the [`FontAwesomeIcon` component](https://fontawesome.com/v5.15/how-to-use/on-the-web/using-with/react), you might that to build this:
```jsx
<FontAwesomeIcon icon={[prefix, iconName]} />
```

If your code is written JavaScript and needs to build an HTML element as a string, it might look like this:
```js
const icon = `<i class="${prefix} ${iconName}"></i>`
```

If your code is a WordPress plugin or theme, it might produce a shortcode like this:
```js
const icon = `[icon prefix="${prefix}" name="${iconName}"]`
```

## Setup

Choose one of the following:

1. Use the `fa-icon-chooser` web component directly.
    Find those [setup instructions in that component's package](packages/fa-icon-chooser/src/components/fa-icon-chooser/readme.md).
1. Use a JavaScript framework integration.
    Currently, the only one available is for [React](packages/fa-icon-chooser-react).

## License Restrictions for Emitted SVG Data

As of version `0.8.0` of this package, the icon chooser's selection events may emit SVG data.

The [Font Awesome Free license](https://fontawesome.com/license/free) permits any Free icons
to be embedded in this way.

The [Font Awesome Pro license](https://fontawesome.com/license) permits Pro icons to embedded by
Pro license holders.

SVG embedding is prohibited for [Font Awesome Pro Lite](https://fontawesome.com/support).

When prohibited by the license, the icon chooser will not emit SVG data in the `IconChooserResult` object.

# Contributors

The Font Awesome team:

|                                                            | Name           | GitHub                                             |
| :--------------------------------------------------------: | -------------- | -------------------------------------------------- |
|  <img src="https://github.com/mlwilkerson.png?size=72" />  | Mike Wilkerson | [@mlwilkerson](https://github.com/mlwilkerson)     |
|     <img src="https://github.com/frrrances.png?size=72" />     | Frances Botsford   | [@frrrances](https://github.com/frrrances)                 |
|     <img src="https://github.com/kelseythejackson.png?size=72" />     | Kelsey Jackson   | [@kelseythejackson](https://github.com/kelseythejackson)                 |
