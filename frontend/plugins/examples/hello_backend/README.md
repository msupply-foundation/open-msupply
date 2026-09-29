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
<<<<<<< HEAD:frontend/examples/hello_backend/README.md
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
  `sql(query, params?)`, and a placeholder is NAMED — `$storeId`, `$from`. The
  executor is `server/repository/src/db_diesel/report_query.rs`. **Never
  interpolate a value a caller sent** — that was open-msupply#687. The rules
  are below.
=======
  not. They come typed from `@common/types`, which this plugin imports for
  `BackendPlugins` — in this repo that resolves to the server-generated
  `backendCommon`, out of tree to the published package.
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
>>>>>>> origin/develop:frontend/plugins/examples/hello_backend/README.md
- Whatever a method returns must survive `JSON` round-tripping — it crosses back
  into Rust as JSON. A `throw` becomes a GraphQL error carrying the message.

## Writing SQL

### Values

SCALARS — string, number, boolean, null — a datetime among them, as a
`YYYY-MM-DD HH:MM:SS` string. That is all the host knows.

`sqlQuery` in `@common/utils` adds two conveniences of its own, both resolved
before the host sees anything:

- a `Date` anywhere a scalar goes, rendered for you;
- an array, expanded into one parameter per element — write `item_id IN
  $itemIds` with no brackets of your own. An empty array becomes `(NULL)`,
  which matches nothing. Mind the inverse: `x NOT IN (NULL)` is NULL, not
  true, so it matches nothing either — check for empty before building that
  branch.

`sqlList` is **deprecated**: it built a quoted list by pasting values into the
text. Pass the array instead.

### What is refused

Loudly, on both engines, rather than quietly returning the wrong rows:

- a `$name` with no value in `params` — unbound, it would read as NULL and
  match nothing, which looks like a real empty result;
- an array or object as one value — refused by name (a list is `sqlQuery`'s
  expansion, not something the host can interpret);
- a positional `$1` alongside named parameters — the two styles cannot be
  mixed, because naming renumbers into `$1`, `$2` of its own;
- any write. The statement runs **read-only**, enforced by the database rather
  than by parsing your SQL, so `UPDATE`/`INSERT`/`DELETE` fail whatever the
  text says. Persist through the narrow `use_repository` API instead. Read-only
  stops writes, not reads — `sql()` still reaches every table, so what you
  select stays your responsibility.

A `$` followed by a digit inside a quoted string, a quoted identifier or a
comment is left alone, so `'$100'`, `AS "Cost $1000"` and `-- costs $5` all
run. Two constructs are not understood and will refuse such a `$`: postgres
dollar-quoting, and a nested block comment.

### Give every parameter a context

On postgres a value is rendered as a typed literal inside `PREPARE`/`EXECUTE`,
so postgres infers its type from how the statement uses it — which is what lets
a datetime string meet a `timestamp` column with nothing declared. A bare
`SELECT $x` has no context to infer from and comes back as **text**. Compare
it, cast it, or use it in an expression. On sqlite rusqlite binds each value
natively, and `:name` works too.

### Structure may be interpolated, values never

An array expands to a value list `(a, b, c)` — right for `IN`, wrong for a
`VALUES` row source, which needs one row per element. Build those parameter
NAMES yourself (`$item0`, `$item1`, …) and interpolate the names, never the
values; `plugins/civ/backend/src/sqlQueries.ts` does exactly this in
`daysOutOfStockTotal`.

### Older servers

`sqlQuery` checks `sql.length >= 2` — the new host is registered with two
arguments, every older one with none — and falls back to rendering the values
itself, so a new bundle still works against a server that predates parameters.
That fallback is temporary. Leaving `params` off entirely also still works: the
text goes through untouched, which is what every bundle written before this
existed does.

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
[`plugins/civ/backend/prebuilt/plugin.js`](../../civ/backend/README.md),
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
