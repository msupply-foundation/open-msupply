/**
 * Codegen runner.
 *
 * Finds every src/**\/*.graphql, runs our custom plugin (codegen/plugin.js)
 * against the live schema, and writes a co-located <name>.generated.ts next to
 * each .graphql file.
 *
 * Uses @graphql-codegen/core (a transitive dep of the CLI) so no extra package
 * is needed beyond graphql-codegen itself.
 *
 * Usage: node codegen/run.js
 *   SCHEMA_URL env overrides the introspection endpoint.
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

const SCHEMA_URL = process.env.SCHEMA_URL || "http://localhost:8000/graphql";
const SRC_DIR = path.resolve(__dirname, "..", "src");
const PLUGIN_PATH = path.resolve(__dirname, "plugin.cjs");

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith(".graphql")) acc.push(full);
  }
  return acc;
}

async function loadSchema() {
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
  return buildClientSchema(json.data);
}

async function main() {
  const files = walk(SRC_DIR);
  if (files.length === 0) {
    console.log("codegen: no .graphql files found under src/");
    return;
  }

  console.log(`codegen: introspecting schema from ${SCHEMA_URL} ...`);
  const clientSchema = await loadSchema();
  // codegen wants a schema AST (DocumentNode); round-trip through SDL.
  const schemaAst = parse(printSchema(clientSchema));

  // The generated files import TypedDocument from src/api/graphql; the import is
  // relative to wherever the .generated.ts lands (they are co-located with their
  // .graphql, which may be anywhere under src/).
  const GRAPHQL_MODULE = path.resolve(SRC_DIR, "api", "graphql");

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const outPath = file.replace(/\.graphql$/, ".generated.ts");
    let graphqlImport = path
      .relative(path.dirname(outPath), GRAPHQL_MODULE)
      .replace(/\\/g, "/");
    if (!graphqlImport.startsWith(".")) graphqlImport = "./" + graphqlImport;
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
