/**
 * The emitted document const, and the three operation kinds.
 *
 * Per operation the plugin emits a type-bound document:
 *
 *   export const <Name> = {
 *     query: "...",
 *   } as TypedDocument<<Name>Result, <Name>Variables>;
 *
 * The `query` string is the runtime text sent to the server — the plugin
 * re-prints the operation and inlines every fragment it actually uses (and only
 * those). It handles query / mutation / subscription, and emits one set of
 * types per named operation in a document. (<Name> is the operation name
 * PascalCased.)
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { generate, resultType, documentString, documentConst } = require("./helpers.js");

test("the Document string is the pretty-printed operation text", () => {
  const schema = `type Query { thing: Thing! } type Thing { id: ID! name: String }`;
  const out = generate({
    schema,
    document: "query Q { thing { id name } }",
  });

  assert.equal(
    documentString(out),
    `query Q {
  thing {
    id
    name
  }
}`,
  );
});

test("the Document inlines reachable fragments and drops unused ones", () => {
  const schema = `type Query { thing: Thing! } type Thing { id: ID! name: String child: Thing }`;
  const out = generate({
    schema,
    document: `
      query Q { thing { ...A } }
      fragment A on Thing { id child { ...B } }
      fragment B on Thing { id }
      fragment C on Thing { name }
    `,
  });

  // C is never reached from Q, so it is NOT included.
  assert.equal(
    documentString(out),
    `query Q {
  thing {
    ...A
  }
}

fragment A on Thing {
  id
  child {
    ...B
  }
}

fragment B on Thing {
  id
}`,
  );
});

test("variables are preserved verbatim in the Document string", () => {
  const schema = `type Query { thing(id: String!): Thing! } type Thing { id: ID! }`;
  const out = generate({
    schema,
    document: "query Q($id: String!) { thing(id: $id) { id } }",
  });

  assert.equal(
    documentString(out),
    `query Q($id: String!) {
  thing(id: $id) {
    id
  }
}`,
  );
});

test("mutations are supported", () => {
  const schema = `
    type Mutation { setName(id: ID!, name: String!): Thing! }
    type Thing { id: ID! name: String! }
    type Query { _empty: Boolean }
  `;
  const out = generate({
    schema,
    document: "mutation M($id: ID!, $name: String!) { setName(id: $id, name: $name) { id name } }",
  });

  assert.equal(
    resultType(out, "M"),
    `{
  setName: {
  id: string;
  name: string;
};
}`,
  );
  assert.match(documentString(out, "M"), /^mutation M/);
});

test("subscriptions are supported", () => {
  const schema = `
    type Subscription { onTick: Tick! }
    type Tick { count: Int! }
    type Query { _empty: Boolean }
  `;
  const out = generate({
    schema,
    document: "subscription S { onTick { count } }",
  });

  assert.equal(resultType(out, "S"), `{\n  onTick: {\n  count: number;\n};\n}`);
  assert.match(documentString(out, "S"), /^subscription S/);
});

test("multiple operations in one document each get their own types", () => {
  const schema = `
    type Query { a: A! b: B! }
    type A { id: ID! }
    type B { id: ID! }
  `;
  const out = generate({
    schema,
    document: `
      query First { a { id } }
      query Second { b { id } }
    `,
  });

  // Both operations are emitted, each with Variables / Result / document const.
  for (const name of ["First", "Second"]) {
    for (const kind of ["Variables", "Result"]) {
      assert.ok(
        out.includes(`export type ${name}${kind} =`),
        `expected ${name}${kind} to be emitted`,
      );
    }
    assert.ok(
      out.includes(`export const ${name} = {`),
      `expected the ${name} document const to be emitted`,
    );
  }
});

test("the document const is bound to TypedDocument<Result, Variables>", () => {
  const schema = `type Query { thing: Thing! } type Thing { id: ID! }`;
  const out = generate({
    schema,
    document: "query Q($id: String!) { thing { id } }",
  });

  assert.equal(
    documentConst(out, "Q"),
    `export const Q = {
  query: "query Q($id: String!) {\\n  thing {\\n    id\\n  }\\n}",
} as TypedDocument<QResult, QVariables>;`,
  );
});

test("operation names are PascalCased for the emitted identifiers", () => {
  // GraphQL operation names are conventionally camelCase; the TS identifiers
  // (type + const names) are PascalCased.
  const schema = `type Query { thing: Thing! } type Thing { id: ID! }`;
  const out = generate({
    schema,
    document: "query stocktakeLines { thing { id } }",
  });

  assert.ok(out.includes("export type StocktakeLinesVariables ="));
  assert.ok(out.includes("export type StocktakeLinesResult ="));
  assert.ok(out.includes("export const StocktakeLines = {"));
});

test("the file imports the TypedDocument type", () => {
  const schema = `type Query { ping: Boolean! }`;
  const out = generate({ schema, document: "query Q { ping }" });

  assert.ok(out.includes(`import type { TypedDocument } from "./graphql";`));
});

test("the generated file starts with the do-not-edit header", () => {
  const schema = `type Query { ping: Boolean! }`;
  const out = generate({ schema, document: "query Q { ping }" });

  assert.ok(out.startsWith("/* eslint-disable */"));
  assert.ok(
    out.includes("THIS FILE IS GENERATED by codegen/plugin.js — do not edit by hand."),
  );
});

test("an anonymous (unnamed) operation is skipped entirely", () => {
  // The plugin guards `if (... || !def.name) continue;` — only named operations
  // produce output, so a bare `{ ping }` yields just the header.
  const schema = `type Query { ping: Boolean! }`;
  const out = generate({ schema, document: "{ ping }" });

  assert.ok(!out.includes("export type"));
  assert.ok(!out.includes("export const"));
});
