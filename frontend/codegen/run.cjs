/**
 * Codegen runner.
 *
 * Finds every .graphql under src/ and under the plugin trees, runs our custom
 * plugin (codegen/plugin.js) against the pinned schema, and writes a co-located
 * <name>.generated.ts next to each .graphql file.
 *
 * Uses @graphql-codegen/core to drive the plugin — the full CLI isn't needed.
 *
 * THE SCHEMA IS THE PINNED ONE (schema.graphql), not a running server.
 * Codegen is then reproducible: the same tree generates the same types on any
 * machine and in CI, and the types agree with the SDL the spec is written
 * against. Generating from whichever server a developer happened to have
 * running made the output depend on that server's build — a schema behind the
 * tree silently rewrote committed types, and one ahead of it generated against
 * fields the branch does not have.
 *
 * The pin is refreshed wholesale by the server's own exporter and never
 * hand-edited: `pnpm generate` does the export and this run in one step (the
 * counterpart of `yarn generate` in client/). Use plain `pnpm codegen` when
 * only a .graphql document changed — it needs no cargo and no backend. CI
 * enforces both halves: spec/IMPLEMENTING.md § C7 and the two workflows
 * (generate-schema.yml for pin == server, frontend-check-test.yaml for
 * generated types == pin).
 *
 * Host and plugin documents differ in exactly one way: where the emitted file
 * imports `TypedDocument` from. A host document gets a relative path to
 * src/api/graphql; a plugin document gets the bare `@openmsupply/plugin-sdk`
 * specifier, which re-exports the same type. That is not a cosmetic choice —
 * a plugin is built as its own bundle and only the shared specifiers are
 * externalised (vite/pluginBuild.ts), so a relative reach into src/ would be
 * INLINED into the plugin, shipping a second copy of the host's GraphQL client
 * with its own module state instead of the host's live one.
 *
 * Usage: node codegen/run.js [path ...]
 *   A path narrows the run to documents under it, e.g. `plugins`.
 *   SCHEMA_URL opts INTO introspecting a running server instead of the pin —
 *   for checking a branch whose backend has not reached schema.graphql
 *   yet. What it generates must not be committed: the pin is what the
 *   committed types belong to.
 */
const fs = require("fs");
const path = require("path");
const { codegen } = require("@graphql-codegen/core");
const {
  parse,
  printSchema,
  buildClientSchema,
  getIntrospectionQuery,
} = require("graphql");

const { allDocuments, graphqlImportFor } = require("./documents.cjs");

const SCHEMA_URL = process.env.SCHEMA_URL;
const SCHEMA_FILE = path.resolve(__dirname, "..", "schema.graphql");
const PLUGIN_PATH = path.resolve(__dirname, "plugin.cjs");

async function introspectSchema() {
  const res = await fetch(SCHEMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: getIntrospectionQuery() }),
  });
  if (!res.ok) {
    throw new Error(`Schema introspection failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error("Introspection errors: " + JSON.stringify(json.errors));
  }
  // codegen wants a schema AST (DocumentNode); round-trip through SDL.
  return parse(printSchema(buildClientSchema(json.data)));
}

function pinnedSchema() {
  if (!fs.existsSync(SCHEMA_FILE)) {
    throw new Error(
      `Pinned schema not found at ${path.relative(process.cwd(), SCHEMA_FILE)}`
    );
  }
  // Already SDL — parse straight to the AST codegen wants.
  return parse(fs.readFileSync(SCHEMA_FILE, "utf8"));
}

async function main() {
  // Positional args narrow the run to documents under those paths, e.g.
  //   node codegen/run.cjs plugins
  // Generating is destructive, so narrowing is how a run avoids rewriting
  // documents it has no business touching.
  const filters = process.argv.slice(2);
  const files = allDocuments(filters);
  if (files.length === 0) {
    console.log(
      filters.length > 0
        ? `codegen: no .graphql files found under ${filters.join(", ")}`
        : "codegen: no .graphql files found under src/ or the plugin trees"
    );
    return;
  }
  if (filters.length > 0) {
    console.log(`codegen: limited to ${filters.join(", ")} (${files.length} file(s))`);
  }

  let schemaAst;
  if (SCHEMA_URL) {
    console.log(`codegen: introspecting schema from ${SCHEMA_URL} ...`);
    console.log(
      "codegen: NOT the pinned schema — do not commit what this run generates."
    );
    schemaAst = await introspectSchema();
  } else {
    console.log(
      `codegen: schema from ${path.relative(process.cwd(), SCHEMA_FILE)} ...`
    );
    schemaAst = pinnedSchema();
  }

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const outPath = file.replace(/\.graphql$/, ".generated.ts");
    const graphqlImport = graphqlImportFor(file, outPath);
    const output = await codegen({
      filename: outPath,
      schema: schemaAst,
      documents: [{ location: file, document: parse(content) }],
      config: { graphqlImport },
      plugins: [{ custom: {} }],
      pluginMap: { custom: require(PLUGIN_PATH) },
    });

    fs.writeFileSync(outPath, output, "utf8");
    console.log(`codegen: ${path.relative(process.cwd(), outPath)}`);
  }

  console.log(`codegen: done (${files.length} file${files.length === 1 ? "" : "s"}).`);
}

main().catch((err) => {
  console.error("codegen failed:", err.message);
  process.exit(1);
});
