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
- **`sql` returns rows keyed by column.** `[{ count: 42 }, …]`, for any SELECT
  — so a statement projects whatever columns it likes and reads them back by
  name. It was not always so: the host used to deserialise every row as
  `JsonRawRow { json_row }`, and a statement that did not project exactly that
  column failed _inside the engine at runtime_ with
  `DIESEL_DESERIALIZATION_ERROR ("Column `json_row` was not present in query")`
  — naming a column you never wrote. The wrapping is no longer necessary, and a
  statement that still does it keeps working, since the host unwraps a single
  `json_row` column. `jsonRows` in `src/plugin.ts` is kept for exactly that
  reason: it is what lets this bundle also run against a server from before the
  change. Out of tree, `sqlQuery` from `@common/utils` is the same idea.
- **`sql` binds values; it does not interpolate them.** The signature is
  `sql(query, params?)`, and a placeholder is NAMED — `$storeId`, `$from`. It
  is the same executor the repo's **report SQL** runs through
  (`server/repository/src/db_diesel/report_query.rs`) and the contract is a
  report's exactly, nothing added: a plugin names a value the way a report
  names `$storeId`. On sqlite rusqlite binds each value natively; on postgres
  each one is rendered as a typed SQL literal (a string quoted with its own
  quotes doubled, a number, boolean or null bare) inside a read-only
  transaction — so postgres reads a value's type from its context exactly as
  it would a literal written by hand, and **either way a caller's string can
  never be SQL**. The values are SCALARS — string, number, boolean, null — a
  datetime among them, as a `YYYY-MM-DD HH:MM:SS` string. There is no array
  and no `Date`: an `IN` list (`item_id IN $itemIds`, no brackets of your own,
  an empty one becoming `(NULL)`) and a `Date` are conveniences of `sqlQuery`
  in `@common/utils`, which turns both into scalars before calling this. Pass
  `params` and every `$name` must have a key, while a positional `$1` does not
  work; a key the text does not use is fine. Leave `params` off and the text
  goes through untouched, so a bundle written before this existed still runs.
  **Never interpolate a value a caller sent** — that was open-msupply#687.
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
