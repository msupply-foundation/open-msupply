/**
 * Integration test: drive the plugin through @graphql-codegen/core exactly the
 * way codegen/run.js does in production.
 *
 * The other test files call the plugin function directly (fast, readable). This
 * one proves the *wiring* is right: the schema is passed as a printed AST
 * (DocumentNode), the plugin is registered via pluginMap, and codegen-core is
 * what actually invokes it. If run.js's call shape ever drifts from what the
 * plugin expects, this test catches it.
 *
 * It does NOT hit the network — run.js fetches the schema over HTTP, but the
 * schema handling after that (buildClientSchema → printSchema → parse) produces
 * the same AST as parsing SDL directly, which is what we do here.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { codegen } = require("@graphql-codegen/core");
const { parse, printSchema, buildSchema } = require("graphql");
const { EXAMPLE_SCHEMA } = require("./fixtures/exampleSchema.js");

const PLUGIN_PATH = path.resolve(__dirname, "..", "plugin.js");

/** Same plumbing as codegen/run.js main(), minus the HTTP fetch. */
async function runThroughCore({ schema, query }) {
  const schemaAst = parse(printSchema(buildSchema(schema)));
  return codegen({
    filename: "out.generated.ts",
    schema: schemaAst,
    documents: [{ location: "test.graphql", document: parse(query) }],
    config: {},
    plugins: [{ custom: {} }],
    pluginMap: { custom: require(PLUGIN_PATH) },
  });
}

test("plugin runs through @graphql-codegen/core and emits the same types", async () => {
  const out = await runThroughCore({
    schema: EXAMPLE_SCHEMA,
    query: `
      query Q($stocktakeId: String!) {
        stocktakeLines(stocktakeId: $stocktakeId) {
          __typename
          ... on StocktakeLineConnector {
            totalCount
            nodes { id itemName }
          }
          ... on StocktakeDoesNotExist {
            description
          }
        }
      }
    `,
  });

  assert.ok(out.includes("export type QVariables = {\n  stocktakeId: string;\n};"));
  // The union result comes out discriminated, exactly as the direct-call tests
  // assert — proving codegen-core drives the plugin the same way.
  assert.ok(
    out.includes(`export type QResult = {
  stocktakeLines: ({
  __typename: "StocktakeLineConnector";
} & {
  totalCount: number;
  nodes: Array<{
  id: string;
  itemName: string;
}>;
}) | ({
  __typename: "StocktakeDoesNotExist";
} & {
  description: string;
});
};`),
  );
  assert.ok(out.includes("export const Q = {"));
  assert.ok(out.includes("as TypedDocument<QResult, QVariables>;"));
});

test("the generated output starts with the header and TypedDocument import", async () => {
  // Sanity: codegen-core succeeded and produced the do-not-edit header. This is
  // the same content run.js would write to disk.
  const out = await runThroughCore({
    schema: EXAMPLE_SCHEMA,
    query:
      "query Q($id: String!) { stocktakeLines(stocktakeId: $id) { __typename } }",
  });

  assert.ok(out.startsWith("/* eslint-disable */"));
  assert.ok(out.includes(`import type { TypedDocument } from "./graphql";`));
  assert.ok(out.includes("export const Q = {"));
});
