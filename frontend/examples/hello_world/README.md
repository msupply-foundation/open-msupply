# `hello_world` — writing a frontend plugin

The reference plugin. Copy this directory to start a new one; the contract it
satisfies is [`spec/plugins/sdk-contract.md`](../../spec/plugins/sdk-contract.md).

## The four files

| File              | What it is                                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `package.json`    | the plugin manifest the server CLI reads: `name` **is** the plugin code, plus `omSupplyPlugin` and a `build-plugin` script |
| `plugin.tsx`      | the entry module — default-exports `definePlugin({...})`                                                                   |
| `vite.config.mjs` | one call to the shared build preset; produces `dist/hello_world.js`                                                        |
| `README.md`       | this                                                                                                                       |

## `package.json`

```json
{
  "name": "hello_world",
  "version": "1.0.0",
  "omSupplyPlugin": { "target": "frontend", "types": ["dashboard"] },
  "scripts": { "build-plugin": "vite build" }
}
```

- **`name` is the plugin code** — `lower_snake_case`, stable forever. It
  namespaces the translation keys, prefixes the contribution ids the host
  registers, and names the emitted bundle (`dist/<name>.js`).
- **`version`** is semver. The central server accepts a plugin only when its
  version is **not newer** than the server's by `(major, minor)`.
- **`build-plugin`** is what the server CLI runs (after `yarn install`), from
  this directory.

## `plugin.tsx`

```tsx
export default definePlugin({
  manifest: { code, version, pluginApiVersion: PLUGIN_API_VERSION },
  translations: { en: { greeting: 'Hello from a plugin' } },
  contributions: [
    { slot: 'dashboard.stat', id: 'greeting', panel: '…', Component },
  ],
});
```

- **Imports are a closed set**: `@openmsupply/plugin-sdk` (and its subpaths) plus
  `solid-js`, `solid-js/web`, `solid-js/store`. Everything else you use is
  bundled into your one file. Never import host source — if you need something
  the SDK does not expose, that is an SDK gap to file.
- Those bare specifiers stay **bare in the built bundle**: the host's import map
  points them at its own live modules, so your `createSignal` is the host's
  `createSignal`. That is the whole mechanism — one Solid runtime, one SDK.
- **`contributions` is one flat array**, discriminated by `slot`. Narrowing on
  `slot` gives you that slot's props and its placement fields (a
  `dashboard.stat` names the `panel` it joins, a `dashboard.panel` names its
  `widget`); `anchor` defaults to the container's end. Anchor by **published
  id**, never by position.
- **`when(ctx)` gates on session facts only** — store, permissions, store
  preferences. A hidden contribution renders nothing and fetches nothing. Gate
  on the _record_ inside your component instead, so a row change never
  remounts the slot.
- **Every user-facing string is a key.** `pluginIntl(code)` prefixes lookups
  with `code:`, so your keys can never collide with the host's or another
  plugin's; until a catalogue is registered the key renders as itself. Server
  custom translations override your bundled strings.
- **Format through the SDK** (`formatNumber`, `localisedDate`, `isRtl`) so digit
  systems and date order follow the app's locale.
- **A contribution that throws is contained** to its own slot. `?pluginBoom`
  turns this plugin's throwing stat on, so you can see it happen.

## Data

Three ways in, all never-throwing (match on `result.kind`):

- `graphqlQuery(document, variables)` — the core schema, with your own
  code-generated documents.
- `pluginBridge<Input, Output>(code).call(input)` / `usePluginQuery(code, () => input)`
  — your own backend half. `usePluginQuery` re-keys on the **serialised** input
  and reads without suspending, so a prop change refreshes the panel in place
  instead of remounting the screen around it.
- `pluginData(code)` — your own server-side records; the plugin code and the
  entered store are injected for you.

## Building

In this repo:

```sh
pnpm build:plugins
```

builds every `examples/*` (plus anything in `OMS_PLUGIN_DIRS`), packs
`dist/bundle.json` — the artifact `remote_server_cli install-plugin-bundle`
uploads — and writes `dist/frontend_plugins/metadata.json` so the built app can
load them through its production path. Run it **after** `pnpm build`, which
empties `dist/`.

Out of tree, the same two commands the CLI runs:

```sh
yarn install && yarn build-plugin   # → dist/<code>.js
```

The preset asserts the result is conformant: exactly one JS file named
`<code>.js`, no stray assets, and no import the host's map does not provide. Any
of those fails the build rather than producing a bundle the transport would
quietly break.

## Versioning

`manifest.pluginApiVersion` is the SDK API you built against. The host refuses a
plugin declaring a **newer** version than it provides, names it in diagnostics,
and loads its siblings anyway — see `examples/api_too_new`.
