/**
 * Scalars, nullability, enums and lists — the foundation of the type mapping.
 *
 * Each test below is a tiny schema + query going IN and the exact `Result` type
 * coming OUT. Read them top-to-bottom as a spec for how a GraphQL field type
 * becomes a TypeScript type.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { generate, resultType } = require("./helpers.js");

test("built-in scalars map to their TS equivalents", () => {
  const schema = `
    type Query {
      str: String!
      bool: Boolean!
      int: Int!
      float: Float!
      id: ID!
    }
  `;
  const out = generate({ schema, document: "query Q { str bool int float id }" });

  assert.equal(
    resultType(out),
    `{
  str: string;
  bool: boolean;
  int: number;
  float: number;
  id: string;
}`,
  );
});

test("non-null fields are not unioned with null; nullable fields are", () => {
  const schema = `
    type Query {
      required: String!
      optional: String
    }
  `;
  const out = generate({ schema, document: "query Q { required optional }" });

  assert.equal(
    resultType(out),
    `{
  required: string;
  optional: string | null;
}`,
  );
});

test("custom scalars NaiveDate and DateTime map to string", () => {
  const schema = `
    scalar NaiveDate
    scalar DateTime
    type Query {
      day: NaiveDate!
      at: DateTime!
    }
  `;
  const out = generate({ schema, document: "query Q { day at }" });

  assert.equal(
    resultType(out),
    `{
  day: string;
  at: string;
}`,
  );
});

test("an unknown/unmapped scalar falls back to string", () => {
  const schema = `
    scalar JSON
    type Query { blob: JSON! }
  `;
  const out = generate({ schema, document: "query Q { blob }" });

  assert.equal(resultType(out), `{\n  blob: string;\n}`);
});

test("enum becomes a string-literal union; nullable enum adds | null", () => {
  const schema = `
    enum Color { RED GREEN BLUE }
    type Query {
      color: Color!
      maybeColor: Color
    }
  `;
  const out = generate({ schema, document: "query Q { color maybeColor }" });

  assert.equal(
    resultType(out),
    `{
  color: "RED" | "GREEN" | "BLUE";
  maybeColor: "RED" | "GREEN" | "BLUE" | null;
}`,
  );
});

test("lists: nullability of the list and of its items are independent", () => {
  const schema = `
    type Query {
      reqListReqItems: [String!]!
      optListReqItems: [String!]
      reqListOptItems: [String]!
      optListOptItems: [String]
    }
  `;
  const out = generate({
    schema,
    document:
      "query Q { reqListReqItems optListReqItems reqListOptItems optListOptItems }",
  });

  assert.equal(
    resultType(out),
    `{
  reqListReqItems: Array<string>;
  optListReqItems: Array<string> | null;
  reqListOptItems: Array<string | null>;
  optListOptItems: Array<string | null> | null;
}`,
  );
});
