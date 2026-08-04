# `hello_backend` — the reference BACKEND plugin

The other half of the plugin system. [`hello_world`](../hello_world/README.md) is a
frontend plugin: Solid components rendering in the browser through the SDK.
This one runs **inside the server**, in its BoaJS engine, with no DOM, no
network and no SDK — and it is **backend-only**, which is an ordinary shape (the
BES, Niger and São Tomé country plugins ship no frontend half at all).

It answers one `graphql_query` call: send `{ type: 'ping' }` and it reports the
calling store and a row count read with real SQL. Small on purpose — what it
demonstrates is the contract, not a calculation.

## The contract

Set by how the server loads the bundle
(`server/service/src/boajs/call_method.rs`):

- The bundle is **one ES module** exporting **`plugins`** — an object whose keys
  are plugin types. The server resolves a callable at the path
  `["plugins", "<type>"]`, so `export { plugins }` is not a convention, it is
  the lookup.
- The keys must match `omSupplyPlugin.types` in `package.json`. Unlike a
  frontend plugin, that field is load-bearing: it is what tells the server which
  calls to route here.
- Host functions — `sql`, `log`, `use_graphql`, `fetch`, `get_store_preferences`
  and the rest — arrive as **globals**, not imports, and are bound **after** the
  module is evaluated. So a method may call them; module top-level code may
  not. `src/host.d.ts` declares the ones this plugin uses; out of tree they come
  typed from `@common/types`.
- **`sql` does not return rows keyed by column.** The host deserialises each row
  as `JsonRawRow { json_row }`, so the statement must project a single column of
  that name holding a JSON object — and the JSON function differs by dialect
  (`json_object` on sqlite, `json_build_object` on postgres, hence
  `sql_type()`). Get it wrong and the query fails _inside the engine at
  runtime_, with `DIESEL_DESERIALIZATION_ERROR ("Column `json_row` was not
present in query")` — naming a column you never wrote. `jsonRows` in
  `src/plugin.ts` does the wrapping; out of tree it is `sqlQuery` from
  `@common/utils`. (The host carries a TODO to wrap it itself; until then it is
  the caller's job.) This one is not theoretical — the first live run of this
  plugin hit exactly that error.
- Whatever a method returns must survive `JSON` round-tripping — it crosses back
  into Rust as JSON. A `throw` becomes a GraphQL error carrying the message.

## Building

```sh
pnpm build:plugins
```

builds it to `dist/backend_plugins/hello_backend/plugin.js` and packs it into
`dist/bundles/hello_backend.json`, its own bundle. The build fails rather than
emitting a bundle the server would load and then find nothing in: exactly one
chunk, named `plugin.js`, exporting `plugins`, importing nothing (BoaJS resolves
no modules, so everything is bundled in).

You can run the built bundle the way the server does — evaluate, bind globals,
resolve, call:

```sh
node --input-type=module -e "
const mod = await import('./dist/backend_plugins/hello_backend/plugin.js');
globalThis.sql_type = () => 'sqlite';
globalThis.sql = () => [{ count: '42' }];
globalThis.log = console.log;
console.log(mod.plugins.graphql_query({ store_id: 's1', input: { type: 'ping' } }));
"
```

## Not how a deployed country plugin is built

CIV's backend half is built by the **open-msupply client toolchain** (webpack +
ts-loader + `backendCommon`) and committed at
[`plugins/civ/backend/prebuilt/plugin.js`](../../plugins/civ/backend/README.md),
which the packer ships **verbatim** — byte-identical to the field bundle. A
committed `prebuilt/plugin.js` always wins; the build here is for a plugin whose
source this repo owns, which today means this one. The two produce different
bytes for the same source, which is precisely why they never both apply.

## Calling it

Any authenticated caller can reach it through the core schema — this is the same
channel the CIV item-information panel uses, and the SDK's `usePluginQuery`
wraps it for a frontend half:

```graphql
query {
  pluginGraphqlQuery(
    storeId: "<store>"
    pluginCode: "hello_backend"
    input: { type: "ping" }
  )
}
```
