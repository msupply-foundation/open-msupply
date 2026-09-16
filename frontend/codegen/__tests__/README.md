# Tests for the codegen plugin

These tests validate [`codegen/plugin.js`](../plugin.js) — the custom
graphql-codegen plugin that turns a GraphQL schema + `.graphql` documents into
`*.generated.ts` files (types + query strings).

They are written to be **read like a spec**: each test is a small schema + query
going **in**, and the exact TypeScript the plugin emits coming **out**. If you
want to know "what does the plugin do with X?", find the test for X and read it.

## Running

```bash
npm test
```

No build step, no extra config — it uses Node's built-in test runner
(`node --test`) and `node:assert`. The plugin is plain CommonJS, so tests call
it directly.

## What the plugin emits

For a query `stocktakeLines` that spreads a `StocktakeLine` fragment, the plugin
produces (per operation / fragment; names are **PascalCased**):

```ts
import type { TypedDocument } from "./graphql";

// one exported type per fragment, referenced wherever it's spread
export type StocktakeLineFragment = { /* ...fields... */ };

export type StocktakeLinesVariables = { /* ...from $variables... */ };
export type StocktakeLinesResult = { /* ...walked against the schema... */ };

// query text + phantom Result/Variables types, bound together
export const StocktakeLines = {
  query: "query stocktakeLines(...) { ... }",
} as TypedDocument<StocktakeLinesResult, StocktakeLinesVariables>;
```

Two behaviours worth calling out (each has its own test file):

- **Discriminated unions.** Inline fragments on a union/interface produce a
  distinct union — `({ __typename: "A" } & {...}) | ({ __typename: "B" } & {...})`
  — not a flattened object. `__typename` is the discriminant.
- **Reusable fragment types.** Each fragment is `export type <Name>Fragment`,
  and spreads reference it (rather than copying fields), so fragments can be
  imported and reused standalone.

## How a test reads

```js
const out = generate({
  schema: "type Query { name: String }",   // IN: the schema
  document: "query Q { name }",             // IN: the query
});

assert.equal(resultType(out, "Q"), `{\n  name: string | null;\n}`); // OUT: the type
```

`generate()` calls the real plugin (the same function `codegen/run.js` calls in
production), so what these tests assert is exactly what lands in the generated
files. Helpers pluck the relevant piece out of the generated file so the
assertion stays focused:

- `resultType(out, "Name")` — the `<Name>Result` type body
- `variablesType(out, "Name")` — the `<Name>Variables` type body
- `fragmentType(out, "Name")` — the `<Name>Fragment` type body
- `documentString(out, "Name")` — the decoded `query` text
- `documentConst(out, "Name")` — the whole `export const <Name> = {...} as TypedDocument<...>;`

`Name` is the **PascalCased** operation/fragment name (operation `stocktakeLines`
→ `StocktakeLines`). Omit it to match the first/only one.

## What's covered

| File | What it pins down |
| --- | --- |
| `scalars-nullability.test.js` | Scalars → TS types, `!` vs nullable, enums, lists (list vs item nullability), unknown-scalar fallback |
| `nested-selections.test.js` | Nested objects, list-of-object, deep nesting, aliases, `__typename` literal, unknown fields skipped |
| `fragments.test.js` | Fragment spreads (referenced by type), nested fragments, inline fragments, fragment-on-union |
| `fragment-types.test.js` | Fragments exposed as reusable `<Name>Fragment` types (PascalCase, defined once, referenced, emitted even if unused) |
| `discriminated-unions.test.js` | Inline fragments on unions/interfaces → distinct union members discriminated on `__typename` |
| `variables.test.js` | The `Variables` type: required vs optional, enums, lists, input objects (expanded inline, recursively) |
| `document-and-operations.test.js` | The `query` string + `TypedDocument` const, fragment inlining (only reachable ones), query/mutation/subscription, multiple operations, PascalCasing, header, anonymous ops |
| `full-example.test.js` | A complete realistic schema + query (with a union + a fragment) → the **entire** generated file, compared against `fixtures/stocktakeLines.expected.ts` |
| `valid-typescript.test.js` | Safety net: for a variety of inputs (incl. unions), the emitted output always parses as valid TypeScript |
| `integration-codegen-core.test.js` | Drives the plugin through `@graphql-codegen/core` exactly as `run.js` does (proves the wiring, not just the function) |

## Adding a test

1. Pick (or add) the file that matches the behaviour.
2. Write the smallest schema + query that shows it.
3. Generate once to see the real output, then paste it into the assertion:
   ```bash
   node -e 'const {generate}=require("./codegen/__tests__/helpers.js");
     console.log(generate({schema:"type Query{a:Int}",document:"query Q{a}"}))'
   ```
4. Run `npm test`.

## Updating the full-example snapshot

If you intentionally change the plugin's output, regenerate the expected file:

```bash
node -e '
  const {generate}=require("./codegen/__tests__/helpers.js");
  const {EXAMPLE_SCHEMA}=require("./codegen/__tests__/fixtures/exampleSchema.js");
  const {STOCKTAKE_LINES_QUERY}=require("./codegen/__tests__/fixtures/stocktakeLines.query.js");
  process.stdout.write(generate({schema:EXAMPLE_SCHEMA,document:STOCKTAKE_LINES_QUERY})+"\n");
' > codegen/__tests__/fixtures/stocktakeLines.expected.ts
```

Then **read the diff** — it is exactly the behaviour change you introduced.
