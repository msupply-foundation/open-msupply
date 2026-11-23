/**
 * Fields under @include / @skip.
 *
 * The server leaves such a field out when its condition is false, so the
 * generated type marks it optional and a caller has to handle its absence.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { generate, resultType } = require("./helpers.cjs");

const SCHEMA = `
  type Query {
    thing: Thing!
  }
  type Thing {
    id: ID!
    name: String
    child: Thing!
  }
`;

test("a field under @include is optional", () => {
  const out = generate({
    schema: SCHEMA,
    document:
      "query Q($withName: Boolean = false) { thing { id name @include(if: $withName) } }",
  });
  assert.equal(
    resultType(out),
    `{
  thing: {
  id: string;
  name?: string | null;
};
}`,
  );
});

test("a nested selection under @skip is optional", () => {
  const out = generate({
    schema: SCHEMA,
    document:
      "query Q($noChild: Boolean!) { thing { id child @skip(if: $noChild) { id } } }",
  });
  assert.equal(
    resultType(out),
    `{
  thing: {
  id: string;
  child?: {
  id: string;
};
};
}`,
  );
});

test("a field with no condition stays required", () => {
  const out = generate({
    schema: SCHEMA,
    document: "query Q { thing { id } }",
  });
  assert.equal(
    resultType(out),
    `{
  thing: {
  id: string;
};
}`,
  );
});
