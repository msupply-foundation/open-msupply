/**
 * Whatever the input, the plugin must emit syntactically valid TypeScript.
 *
 * The other tests pin down the EXACT output for specific inputs. This file is
 * the safety net for everything else: throw a variety of schemas + queries at
 * the plugin and assert the result always parses as TypeScript. If a future
 * change ever produces a stray `;`, an unbalanced brace, etc., this catches it
 * even for inputs we didn't write an exact-output test for.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { generate, tsSyntaxErrors } = require("./helpers.js");
const { EXAMPLE_SCHEMA } = require("./fixtures/exampleSchema.js");
const { STOCKTAKE_LINES_QUERY } = require("./fixtures/stocktakeLines.query.js");

const CASES = [
  {
    name: "simple scalars",
    schema: "type Query { a: String! b: Int }",
    document: "query Q { a b }",
  },
  {
    name: "enums and lists",
    schema: "enum E { X Y } type Query { e: E! es: [E!]! }",
    document: "query Q { e es }",
  },
  {
    name: "nested objects and aliases",
    schema: "type Query { t: T! } type T { id: ID! child: T }",
    document: "query Q { renamed: t { id child { id } } }",
  },
  {
    name: "variables with input objects",
    schema:
      "input In { a: Int b: [String!] } type Query { f(x: In): Boolean! }",
    document: "query Q($x: In) { f(x: $x) }",
  },
  {
    name: "fragments and inline fragments",
    schema:
      "type Query { n: Node! } interface Node { id: ID! } type U implements Node { id: ID! email: String! }",
    document:
      "query Q { n { id ...Frag ... on U { email } } } fragment Frag on Node { id }",
  },
  {
    name: "discriminated union with multiple branches",
    schema:
      "type Query { r: R! } type A { id: ID! a: String! } type B { id: ID! b: Int! } type C { id: ID! c: Boolean! } union R = A | B | C",
    document:
      "query Q { r { __typename ... on A { a } ... on B { b } ... on C { c } } }",
  },
  {
    name: "list of a discriminated union",
    schema:
      "type Query { rs: [R!]! } type A { x: String! } type B { y: Int! } union R = A | B",
    document: "query Q { rs { __typename ... on A { x } ... on B { y } } }",
  },
  {
    name: "mutation",
    schema:
      "type Mutation { go(id: ID!): T! } type T { id: ID! } type Query { _: Boolean }",
    document: "mutation M($id: ID!) { go(id: $id) { id } }",
  },
  {
    name: "the full real-world example",
    schema: EXAMPLE_SCHEMA,
    document: STOCKTAKE_LINES_QUERY,
  },
];

for (const c of CASES) {
  test(`emits valid TypeScript: ${c.name}`, () => {
    const out = generate({ schema: c.schema, document: c.document });
    const errors = tsSyntaxErrors(out);
    assert.deepEqual(
      errors,
      [],
      `expected no TS syntax errors, got:\n${errors.join("\n")}\n\n--- generated ---\n${out}`,
    );
  });
}

test("sanity check: the validator actually rejects malformed TypeScript", () => {
  // Guards against the checker silently passing everything.
  const errors = tsSyntaxErrors("export type Broken = { a: ;");
  assert.ok(errors.length > 0, "expected the TS validator to report an error");
});
