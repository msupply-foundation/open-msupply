/**
 * Document validation: the plugin refuses to generate from documents the
 * server would reject at runtime — unknown fields, unknown arguments,
 * undefined fragment spreads, and unused variables all fail generation with
 * the file named in the error. Same behaviour as @graphql-codegen/cli.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { codegen } = require("@graphql-codegen/core");
const { parse, printSchema, buildSchema } = require("graphql");
const { generate } = require("./helpers.cjs");

const SCHEMA = `
  type Query { stocktake: Stocktake }
  type Stocktake { id: ID!, stocktakeNumber: Int!, comment: String }
`;

test("unknown field fails generation instead of silently vanishing", () => {
  assert.throws(
    () =>
      generate({
        schema: SCHEMA,
        document: `query q { stocktake { id stocktakeNumbre } }`,
      }),
    /Cannot query field "stocktakeNumbre" on type "Stocktake"/
  );
});

test("unknown argument fails generation", () => {
  assert.throws(
    () =>
      generate({
        schema: SCHEMA,
        document: `query q { stocktake(storeId: "x") { id } }`,
      }),
    /Unknown argument "storeId"/
  );
});

test("spread of an undefined fragment fails generation", () => {
  assert.throws(
    () =>
      generate({
        schema: SCHEMA,
        document: `query q { stocktake { ...NoSuchFragment } }`,
      }),
    /Unknown fragment "NoSuchFragment"/
  );
});

test("fragment defined in a sibling document resolves; an unused one is legal", () => {
  // Mirrors graphql-tools' validateGraphQlDocuments: documents validate
  // together (cross-document spreads are fine) and NoUnusedFragments is
  // dropped (a shared fragment-only document must not fail generation).
  const out = generate({
    schema: SCHEMA,
    document: [
      `fragment Row on Stocktake { id comment }
       fragment UnusedElsewhere on Stocktake { stocktakeNumber }`,
      `query q { stocktake { ...Row } }`,
    ],
  });
  assert.match(out, /RowFragment/);
});

test("validation failure reaches run.js's call shape (through @graphql-codegen/core)", async () => {
  // Same plumbing as codegen/run.js main(), minus the HTTP fetch — proves the
  // production path rejects an invalid document. Note @graphql-codegen/core
  // ALSO validates documents by default and fires first with its own message;
  // the plugin's validateDocuments covers direct plugin invocation (the other
  // tests here) and backstops core in case its validation is ever skipped.
  const schemaAst = parse(printSchema(buildSchema(SCHEMA)));
  await assert.rejects(
    codegen({
      filename: "out.generated.ts",
      schema: schemaAst,
      documents: [
        {
          location: "src/sections/example/example.graphql",
          document: parse(`query q { stocktake { id stocktakeNumbre } }`),
        },
      ],
      config: {},
      plugins: [{ custom: {} }],
      pluginMap: { custom: require(path.resolve(__dirname, "..", "plugin.cjs")) },
    }),
    /Cannot query field "stocktakeNumbre"/
  );
});
