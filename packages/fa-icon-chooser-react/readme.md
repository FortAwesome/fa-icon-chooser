# FaIconChooser React Component

Find API References for the required callback functions in the [`fa-icon-chooser` component documentation over here](../fa-icon-chooser/src/components/fa-icon-chooser/readme.md).

## Usage

```
npm install --save @fortawesome/fa-icon-chooser-react
```

```js
import ReactDOM from 'react-dom'
import { FaIconChooser } from '@fortawesome/fa-icon-chooser-react'

// One or both of these would be provided somehow by the user.
// If both are provided as propse, kitToken takes priority over version.
// If only version is present, the Icon Chooser will run with only
// Font Awesome Free with the given version.
const version = '5.15.5'
const kitToken = undefined

// Implement the required callback functions.

function handleQuery() {
  // ...
}

function handleResult() {
  // ...
}

function getUrlText() {
  // ...
}

const chooser = <FaIconChooser
  version={ version }
  kitToken={ kitToken }
  handleQuery={ handleQuery }
  getUrlText={ getUrlText }
  onFinish={ handleResult }
></FaIconChooser>

ReactDOM.render(chooser, document.body)
```

See also the [example React app](example).