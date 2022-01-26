# Setup

1. Build the `fa-icon-chooser` component

In that directory that contains that component's `package.json`:

```
npm install
npm run build
```

1. Build the `fa-icon-chooser-react` component

In the directory that contains `fa-icon-chooser-react/package.json`:

```
npm install
npm run build
```

1. Set up `local.json`

There must be a `local.json` under `public/dev/local.json`.

See the [`DEVELOPMENT.md`](../../../DEVELOPMENT.md) doc for more about `local.json`.

It may be easiest to just make a symbolic link from `public/dev/local.json` to the `local.json`
you may already have under `fa-icon-chooser/dev/local.json`.

Or create a new file with appropriate contents according to `DEVELOPMENT.md` linked above. 

# Run

### `npm run start`

Runs the example app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.
