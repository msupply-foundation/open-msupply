/**
 * Operation variables → the `<Name>Variables` type.
 *
 * Variables come from an operation's `($x: Type)` definitions. Required vars
 * (`Type!`) are required keys; nullable vars are optional (`?`) AND `| null`.
 * Input object types are expanded inline, recursively.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { generate, variablesType } = require("./helpers.js");

test("an operation with no variables produces Record<string, never>", () => {
  const schema = `type Query { ping: Boolean! }`;
  const out = generate({ schema, document: "query Q { ping }" });

  assert.equal(variablesType(out), "Record<string, never>");
});

test("required scalar variables are required keys; nullable ones are optional", () => {
  const schema = `type Query { f(a: String!, b: String): Boolean! }`;
  const out = generate({
    schema,
    document: 'query Q($a: String!, $b: String) { f(a: $a, b: $b) }',
  });

  assert.equal(
    variablesType(out),
    `{
  a: string;
  b?: string | null;
}`,
  );
});

test("scalar variable types map the same way as output scalars", () => {
  const schema = `
    scalar DateTime
    type Query { f(s: String!, i: Int!, b: Boolean!, fl: Float!, id: ID!, dt: DateTime!): Boolean! }
  `;
  const out = generate({
    schema,
    document:
      "query Q($s: String!, $i: Int!, $b: Boolean!, $fl: Float!, $id: ID!, $dt: DateTime!) { f(s:$s, i:$i, b:$b, fl:$fl, id:$id, dt:$dt) }",
  });

  assert.equal(
    variablesType(out),
    `{
  s: string;
  i: number;
  b: boolean;
  fl: number;
  id: string;
  dt: string;
}`,
  );
});

test("enum variables become a string-literal union", () => {
  const schema = `
    enum Status { ON OFF }
    type Query { f(c: Status): Boolean! }
  `;
  const out = generate({
    schema,
    document: "query Q($c: Status) { f(c: $c) }",
  });

  assert.equal(variablesType(out), `{\n  c?: "ON" | "OFF" | null;\n}`);
});

test("list variables: required list of required scalars", () => {
  const schema = `type Query { f(ids: [String!]!): Boolean! }`;
  const out = generate({
    schema,
    document: "query Q($ids: [String!]!) { f(ids: $ids) }",
  });

  assert.equal(variablesType(out), `{\n  ids: Array<string>;\n}`);
});

test("input object variables are expanded inline", () => {
  const schema = `
    input PaginationInput { first: Int  offset: Int }
    type Query { f(page: PaginationInput): Boolean! }
  `;
  const out = generate({
    schema,
    document: "query Q($page: PaginationInput) { f(page: $page) }",
  });

  assert.equal(
    variablesType(out),
    `{
  page?: {
    first?: number | null;
    offset?: number | null;
  } | null;
}`,
  );
});

test("nested input objects and required fields inside inputs", () => {
  const schema = `
    input Inner { v: Int! }
    input Outer { inner: Inner  tags: [String!]! }
    type Query { f(d: Outer): Boolean! }
  `;
  const out = generate({
    schema,
    document: "query Q($d: Outer) { f(d: $d) }",
  });

  assert.equal(
    variablesType(out),
    `{
  d?: {
    inner?: {
    v: number;
  } | null;
    tags: Array<string>;
  } | null;
}`,
  );
});

test("a list of input objects (e.g. a sort array)", () => {
  const schema = `
    enum SortKey { NAME DATE }
    input SortInput { key: SortKey! desc: Boolean }
    type Query { f(sort: [SortInput!]): Boolean! }
  `;
  const out = generate({
    schema,
    document: "query Q($sort: [SortInput!]) { f(sort: $sort) }",
  });

  assert.equal(
    variablesType(out),
    `{
  sort?: Array<{
    key: "NAME" | "DATE";
    desc?: boolean | null;
  }> | null;
}`,
  );
});
