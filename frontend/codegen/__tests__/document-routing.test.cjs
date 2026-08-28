/**
 * Document discovery and import routing (codegen/documents.cjs).
 *
 * The host/plugin decision is the one that fails silently. A plugin document
 * emitted with a relative reach into src/api/graphql still builds — the plugin
 * bundle just INLINES the host's GraphQL client (only shared specifiers are
 * externalised, vite/pluginBuild.ts), so the plugin runs against a second
 * client with its own module state instead of the host's live one. Nothing
 * surfaces that at build time, so it is pinned here instead.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  PLUGIN_DIRS,
  PLUGIN_SDK_SPECIFIER,
  SRC_DIR,
  allDocuments,
  graphqlImportFor,
  isPluginDocument,
  walk,
} = require("../documents.cjs");

const FRONTEND = path.resolve(__dirname, "..", "..");
const at = (...parts) => path.join(FRONTEND, ...parts);

const outFor = file => file.replace(/\.graphql$/, ".generated.ts");
const importFor = file => graphqlImportFor(file, outFor(file));

// ── which documents are a plugin's ────────────────────────────────────────────

test("a document under plugins/ is a plugin document", () => {
  assert.equal(
    isPluginDocument(at("plugins", "cook_islands", "src", "figures.graphql")),
    true
  );
});

test("a document under examples/ is a plugin document — reference plugins build through the same preset", () => {
  assert.equal(
    isPluginDocument(at("examples", "hello_world", "src", "q.graphql")),
    true
  );
});

test("a document under src/ is NOT a plugin document", () => {
  assert.equal(
    isPluginDocument(at("src", "sections", "dashboard", "counts.graphql")),
    false
  );
});

test("a src/ path that merely starts with a plugin dir's name is not a plugin document", () => {
  // `src/plugins/` is the HOST half of the plugin system — loader, registry,
  // slot regions — and its documents are host documents.
  assert.equal(isPluginDocument(at("src", "plugins", "discovery.graphql")), false);
});

// ── where the emitted file imports TypedDocument from ────────────────────────

test("a plugin document imports TypedDocument from the SDK by bare specifier", () => {
  assert.equal(
    importFor(at("plugins", "cook_islands", "src", "strip", "figures.graphql")),
    PLUGIN_SDK_SPECIFIER
  );
});

test("the SDK specifier does not vary with how deep the plugin document sits", () => {
  const shallow = importFor(at("plugins", "civ", "q.graphql"));
  const deep = importFor(at("plugins", "civ", "a", "b", "c", "d", "q.graphql"));
  assert.equal(shallow, deep);
  assert.equal(deep, PLUGIN_SDK_SPECIFIER);
});

test("a host document imports TypedDocument by relative path to src/api/graphql", () => {
  assert.equal(
    importFor(at("src", "sections", "dashboard", "counts.graphql")),
    "../../api/graphql"
  );
});

test("a host document beside src/api/graphql gets a './'-prefixed relative path", () => {
  assert.equal(importFor(at("src", "api", "counts.graphql")), "./graphql");
});

test("a plugin import is bare — never relative, which is what would inline the host client", () => {
  const emitted = importFor(at("plugins", "cook_islands", "src", "q.graphql"));
  assert.ok(!emitted.startsWith("."), `expected a bare specifier, got ${emitted}`);
});

// ── discovery ────────────────────────────────────────────────────────────────

test("walk ignores a directory that does not exist rather than throwing", () => {
  assert.deepEqual(walk(at("does-not-exist")), []);
});

test("walk skips node_modules and dist", () => {
  const found = walk(at("plugins"));
  const skipped = found.filter(f =>
    f.split(path.sep).some(seg => seg === "node_modules" || seg === "dist")
  );
  assert.deepEqual(skipped, []);
});

test("walk finds only .graphql files", () => {
  const notGraphql = walk(SRC_DIR).filter(f => !f.endsWith(".graphql"));
  assert.deepEqual(notGraphql, []);
});

test("allDocuments covers the host tree and yields absolute paths", () => {
  const files = allDocuments();
  assert.ok(files.length > 0, "expected the host tree to hold documents");
  assert.ok(files.every(f => path.isAbsolute(f)));
  assert.ok(files.some(f => f.startsWith(SRC_DIR)));
});

// ── narrowing a run ──────────────────────────────────────────────────────────

test("no filters means every document", () => {
  assert.deepEqual(allDocuments([]), allDocuments());
});

test("a filter narrows the run to that tree", () => {
  const plugins = allDocuments(["plugins"]);
  assert.ok(plugins.length > 0, "expected the plugin tree to hold documents");
  assert.ok(plugins.every(isPluginDocument));
  assert.ok(!plugins.some(f => f.startsWith(SRC_DIR)));
});

test("a filter genuinely excludes — narrowing is smaller than the whole", () => {
  assert.ok(allDocuments(["plugins"]).length < allDocuments().length);
});

test("filters accept several trees at once", () => {
  const both = allDocuments(["plugins", "src"]);
  assert.deepEqual(both.sort(), allDocuments().sort());
});

test("a filter matching nothing yields nothing rather than everything", () => {
  // The dangerous failure: a typo'd filter silently regenerating the world.
  assert.deepEqual(allDocuments(["no-such-tree"]), []);
});

test("a filter is a path boundary, not a string prefix", () => {
  // "plugin" must not sweep in "plugins/".
  assert.deepEqual(allDocuments(["plugin"]), []);
});

// ── the backstop over what is actually on disk ───────────────────────────────

/*
 * Neither of the two guards that normally keep a plugin out of host source
 * covers a GENERATED file:
 *   - tsconfig.plugins.json omits the `@/*` mapping, but a RELATIVE escape
 *     (`../../../../src/api/graphql`) still resolves and compiles.
 *   - eslint's no-restricted-imports does block that pattern — but every
 *     generated file opens with `/* eslint-disable *​/`, which turns it off.
 * So the routing above is the only thing standing between a plugin and a
 * second, unauthenticated copy of the host's GraphQL client. This asserts the
 * property directly on the emitted files, so a bad regeneration or a hand-edit
 * fails here rather than in a browser.
 */
test("every committed plugin .generated.ts imports only the SDK", () => {
  const fs = require("node:fs");
  const generated = PLUGIN_DIRS.flatMap(dir =>
    walk(dir).map(doc => doc.replace(/\.graphql$/, ".generated.ts"))
  ).filter(fs.existsSync);

  for (const file of generated) {
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const match = line.match(/^\s*import\s[^;]*?from\s+["']([^"']+)["']/);
      if (!match) continue;
      assert.equal(
        match[1],
        PLUGIN_SDK_SPECIFIER,
        `${path.relative(FRONTEND, file)} imports "${match[1]}" — a plugin may ` +
          `import only ${PLUGIN_SDK_SPECIFIER}; a reach into host source is ` +
          `inlined into the plugin bundle rather than resolved through the ` +
          `import map`
      );
    }
  }
});

// ── the whole pipeline ───────────────────────────────────────────────────────

test("every discovered document routes to exactly one import shape", () => {
  for (const file of allDocuments()) {
    const emitted = importFor(file);
    const bare = emitted === PLUGIN_SDK_SPECIFIER;
    assert.equal(
      bare,
      isPluginDocument(file),
      `${file} routed to ${emitted}, which contradicts its ownership`
    );
  }
});
