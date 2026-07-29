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

## The dev loop

Two dev-only ways to run a plugin the server has not got installed. Both are
`pnpm dev` only — they are dead-code-eliminated from a production build — and
both go through the **same** validation the installed path uses (brand, code
match, API-version gate), so nothing here can make a plugin the server would
refuse look like it works. Watch the console: every dev plugin logs a
`[plugins] <code>: …` line saying where it came from.

### 1. From source — `OMS_PLUGIN_DIRS` (the authoring loop)

```sh
OMS_PLUGIN_DIRS=../civ-plugins/frontend/latest pnpm dev
```

Colon- or comma-separated, each entry absolute or relative to the repo root. Your
plugin's **source** is imported into the app's own module graph, so you get one
Solid runtime, the live in-tree SDK (no rebuild after an SDK edit), and **HMR on
your own files**. Every `examples/*` plugin is loaded this way too, always.

- The entry module is the first of `plugin.tsx`, `plugin.ts`, `src/plugin.tsx`,
  `src/plugin.ts` that exists in the directory — the same rule
  `pnpm build:plugins` uses.
- A directory is a plugin because its `package.json` says
  `"omSupplyPlugin": { "target": "frontend" }`; `name` is the code the host
  registers it as, exactly as at install time.
- No build step, no import map, no server round trip. Discovery is not involved
  either, so this works with the backend down.
- Restart `pnpm dev` after changing `OMS_PLUGIN_DIRS`, adding a plugin
  directory, or renaming an entry file — the set is enumerated once. Editing a
  plugin's own files does not need a restart.
- A directory that cannot be used (no `package.json`, not a frontend plugin, no
  entry) is named in the Vite log rather than silently skipped.

### 2. From a built bundle — `?devPlugin=`

```sh
# in your plugin's checkout
yarn build-plugin && npx vite preview --outDir dist --port 4173 --cors
```

then open the app with

```text
http://localhost:3005/?devPlugin=civ_plugins@http://localhost:4173/civ_plugins.js
```

The **built** bundle is imported cross-origin from wherever you serve your
`dist/` (your server must send CORS headers). This is the production load path in
every respect except discovery, so it is what to check a bundle with before
installing it. Repeatable and comma-separated:
`?devPlugin=a@http://…/a.js,b@http://…/b.js`.

### Overriding an installed plugin

Dev plugins load **after** the installed ones, and a dev plugin whose code
matches an installed one **replaces** it — that is the point. The diagnostic says
so ("dev override loaded from … — REPLACES the plugin already registered under
this code"), so you can always tell which copy you are looking at.

### Never bundle your own `solid-js`

Keep `solid-js` (and `@openmsupply/plugin-sdk`) a **devDependency**, pinned to
the host's version, and never import them any way but bare. The build preset
externalises them and the host's import map supplies its own live instances; a
second Solid copy inside your bundle does not error — it silently breaks
reactivity and context, which is the failure class this whole mechanism exists to
delete. `pnpm build:plugins` fails the build if your bundle imports anything the
host does not provide, so keep it green.

## Versioning

`manifest.pluginApiVersion` is the SDK API you built against. The host refuses a
plugin declaring a **newer** version than it provides, names it in diagnostics,
and loads its siblings anyway — see `examples/api_too_new`.
