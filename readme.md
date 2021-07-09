![Built With Stencil](https://img.shields.io/badge/-Built%20With%20Stencil-16161d.svg?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjIuMSwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCA1MTIgNTEyOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI%2BCjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI%2BCgkuc3Qwe2ZpbGw6I0ZGRkZGRjt9Cjwvc3R5bGU%2BCjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik00MjQuNywzNzMuOWMwLDM3LjYtNTUuMSw2OC42LTkyLjcsNjguNkgxODAuNGMtMzcuOSwwLTkyLjctMzAuNy05Mi43LTY4LjZ2LTMuNmgzMzYuOVYzNzMuOXoiLz4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTQyNC43LDI5Mi4xSDE4MC40Yy0zNy42LDAtOTIuNy0zMS05Mi43LTY4LjZ2LTMuNkgzMzJjMzcuNiwwLDkyLjcsMzEsOTIuNyw2OC42VjI5Mi4xeiIvPgo8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNDI0LjcsMTQxLjdIODcuN3YtMy42YzAtMzcuNiw1NC44LTY4LjYsOTIuNy02OC42SDMzMmMzNy45LDAsOTIuNywzMC43LDkyLjcsNjguNlYxNDEuN3oiLz4KPC9zdmc%2BCg%3D%3D&colorA=16161d&style=flat-square)

# Font Awesome Icon Chooser

A Web Component built with [Stencil](https://stenciljs.com/), for use in other
projects that want to provide a Font Awesome Icon search and discovery experience.

It's powered by the same Algolia search that used in the [Font Awesome Icon Gallery](https://fontawesome.com/icons).

Used, for example, in the [Font Awesome official WordPress plugin](https://github.com/FortAwesome/wordpress-fontawesome).

## Overview

The Icon Chooser can be wired up to a Font Awesome Kit, using that kit's unique token,
or without a kit, given just a Font Awesome version number.

In non-kit mode, only Font Awesome Free is available.

When used with a kit, everything is avaiable, according to that kit's configuration.
- Font Awesome Pro
- Font Awesome 6 (currently in beta, but if the given kit is set to FA6, the Icon Chooser knows what to do)
- Kit Icon Uploads: any icons uploaded to the kit are available 

## Basic Interaction
1. User takes some action in your app to insert a Font Awesome Icon.
2. Your code mounts this Icon Chooser and listens for the `finish` event to be fired in the DOM.
3. Your code uses the `IconChooserResult` object delivered by that event to render the results of the user's choice.

For example, an `IconChooserResult` might be:
```javascript
{ prefix: "fad", iconName: "alien" }
```

If your code is a React app, you might that to build this:
```jsx
<FontAwesomeIcon icon={[prefix, iconName]} />
```

If your code is written JavaScript and needs to build an HTML element, it might look like this:
```js
const icon = `<i class="${prefix} ${iconName}"></i>`
```

If your code is a WordPress plugin or theme, it might producea shortcode like this:
```js
const icon = `[icon prefix="${prefix}" name="${iconName}"]`
```

**Heads Up!** the `IconChooserResult` type allows for more complexity than just
a single icon's `prefix` and `iconName`. It's designed to be able to express
most of the structures necessary for [Layering, Masks, and Power Transforms](https://fontawesome.com/v5.15/how-to-use/on-the-web/styling/layering). However, those features are
not yet available in the Icon Chooser UI. In the meantime, just be careful about
the assumptions you make about the shape of that `IconChooserResult` object.

## Setup

Using this component requires front end development work directly in JavaScript
and the DOM. It's intended for developers integrating Font Awesome into their apps
and components.

Using the `fa-icon-chooser` web component directly requires some wiring up. Some
required props cannot be passed using HTML attribute syntax, such as the `handleQuery`
callback function.

Find those [setup instructions in that component's package](packages/fa-icon-chooser).

Or you could use a JavaScript framework integration. Currently, the only one available is
for [React](packages/fa-icon-chooser-react).