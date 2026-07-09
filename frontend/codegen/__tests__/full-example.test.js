/**
 * A full, real-world example: the ENTIRE generated file for a realistic query.
 *
 * This is the most "human readable" test in the suite — it's a complete
 * schema + query → complete generated *.ts file, end to end. The three inputs
 * and the one output all live as files you can open and read:
 *
 *   IN  : fixtures/exampleSchema.js        (the schema)
 *   IN  : fixtures/stocktakeLines.query.js (the query + fragment)
 *   OUT : fixtures/stocktakeLines.expected.ts (exactly what the plugin emits)
 *
 * If you change the plugin and this test fails, open the expected.ts fixture
 * and the actual output side by side — the diff IS the behaviour change.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { generate } = require("./helpers.js");
const { EXAMPLE_SCHEMA } = require("./fixtures/exampleSchema.js");
const { STOCKTAKE_LINES_QUERY } = require("./fixtures/stocktakeLines.query.js");

test("generates the complete expected .ts file for the stocktakeLines query", () => {
  const actual = generate({
    schema: EXAMPLE_SCHEMA,
    document: STOCKTAKE_LINES_QUERY,
  });

  // The fixture is a real file so it's easy to read/diff. It carries a trailing
  // newline (most editors add one); the plugin output does not, so compare
  // with trailing whitespace trimmed on both sides.
  const expected = fs.readFileSync(
    path.join(__dirname, "fixtures", "stocktakeLines.expected.ts"),
    "utf8",
  );

  assert.equal(actual.trimEnd(), expected.trimEnd());
});
