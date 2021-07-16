# fa-icon-chooser web component

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
  const result = event && event.detail;

  if (result) {
    console.log(`<i class"${result.prefix} ${result.iconName}">`);
  }
}

window.addEventListener('DOMContentLoaded', event => {
  const container = document.querySelector('#fa-icon-chooser-container');
  const el = document.createElement('fa-icon-chooser');
  el.handleQuery = handleQuery;
  el.getUrlText = getUrlText;
  el.addEventListener('finish', handleResult);
  container.appendChild(el);
});
```

See the `fa-icon-chooser` [API Reference](src/components/fa-icon-chooser/readme.md)
for details about what you'd need to implement in
`handleQuery()`, `getUrlText()`, and `handleResult()`.

You can also look at some example implementations in this repo's [development runtime code](../../dev/runtime.js).
