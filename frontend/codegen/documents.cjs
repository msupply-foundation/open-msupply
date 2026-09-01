/**
 * Which .graphql documents codegen generates from, and where each emitted file
 * imports `TypedDocument` from.
 *
 * Split out of run.cjs so the routing is testable on its own: the host/plugin
 * decision is the load-bearing part, and getting it wrong fails SILENTLY.
 * A plugin is built as its own bundle with only the shared specifiers
 * externalised (vite/pluginBuild.ts), so a plugin document emitted with a
 * relative reach into src/api/graphql would be INLINED — shipping a second
 * copy of the host's GraphQL client, with its own module state, instead of
 * resolving through the import map to the host's live one. Nothing about that
 * failure is visible at build time.
 */
const fs = require("fs");
const path = require("path");

const FRONTEND_DIR = path.resolve(__dirname, "..");

const SRC_DIR = path.join(FRONTEND_DIR, "src");

/*
 * Both trees build through the plugin preset, so both take the SDK import:
 * the per-deployment plugins, and the reference plugins they are modelled on
 * (frontend/CLAUDE.md § country plugins).
 */
const PLUGIN_DIRS = [
  path.join(FRONTEND_DIR, "plugins"),
  path.join(FRONTEND_DIR, "examples"),
];

/** The SDK re-exports the host's own `TypedDocument`; same type, bare specifier. */
const PLUGIN_SDK_SPECIFIER = "@openmsupply/plugin-sdk";

/** Where a host document's emitted file finds `TypedDocument`. */
const GRAPHQL_MODULE = path.join(SRC_DIR, "api", "graphql");

/*
 * A plugin directory carries its own node_modules and build output; neither
 * holds documents of ours, and walking them is slow and wrong.
 */
const SKIP_DIRS = new Set(["node_modules", "dist"]);

/** Every .graphql under `dir`, recursively. Missing directories yield nothing. */
const walk = (dir, acc = []) => {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith(".graphql")) acc.push(full);
  }
  return acc;
};

const isUnder = (file, dir) => {
  const rel = path.relative(dir, file);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
};

/** Is this document owned by a plugin rather than the host? */
const isPluginDocument = file =>
  PLUGIN_DIRS.some(dir => isUnder(path.resolve(file), dir));

/**
 * The `graphqlImport` the emitter writes into `outPath`'s import statement:
 * the bare SDK specifier for a plugin document, else a relative path to
 * src/api/graphql (the emitted file is co-located with its .graphql, which may
 * be anywhere under src/).
 */
const graphqlImportFor = (file, outPath) => {
  if (isPluginDocument(file)) return PLUGIN_SDK_SPECIFIER;
  const relative = path
    .relative(path.dirname(outPath), GRAPHQL_MODULE)
    .replace(/\\/g, "/");
  return relative.startsWith(".") ? relative : "./" + relative;
};

/**
 * Every document codegen generates from, host first.
 *
 * `filters` narrows the run to documents under the given paths (relative to
 * frontend/, or absolute) — `allDocuments(["plugins"])` regenerates only the
 * plugin trees. Narrowing exists so a run can leave files alone that a
 * mismatched schema would otherwise rewrite: generating is destructive, and an
 * unrelated document regenerated against the wrong server lands as silent
 * churn in someone's diff. No filters means every document.
 */
const allDocuments = (filters = []) => {
  const found = [SRC_DIR, ...PLUGIN_DIRS].flatMap(dir => walk(dir));
  if (filters.length === 0) return found;
  const roots = filters.map(f => path.resolve(FRONTEND_DIR, f));
  return found.filter(file =>
    roots.some(root => file === root || isUnder(file, root))
  );
};

module.exports = {
  PLUGIN_DIRS,
  PLUGIN_SDK_SPECIFIER,
  SRC_DIR,
  allDocuments,
  graphqlImportFor,
  isPluginDocument,
  walk,
};
