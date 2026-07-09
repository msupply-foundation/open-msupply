/**
 * Nested object selections, aliases and __typename.
 *
 * These show how the plugin walks INTO selection sets: nested objects become
 * nested TS object types, list-of-object nests inside Array<...>, aliases rename
 * the key, and __typename is always typed as `string`.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { generate, resultType } = require("./helpers.js");

const SCHEMA = `
  type Query {
    thing: Thing!
    maybeThing: Thing
    things: [Thing!]!
  }
  type Thing {
    id: ID!
    name: String
    child: Thing
  }
`;

test("a nested object field becomes a nested object type", () => {
  const out = generate({
    schema: SCHEMA,
    document: "query Q { thing { id name } }",
  });

  assert.equal(
    resultType(out),
    `{
  thing: {
  id: string;
  name: string | null;
};
}`,
  );
});

test("a nullable object field adds | null to the nested object", () => {
  const out = generate({
    schema: SCHEMA,
    document: "query Q { maybeThing { id } }",
  });

  assert.equal(
    resultType(out),
    `{
  maybeThing: {
  id: string;
} | null;
}`,
  );
});

test("a list of objects nests the object type inside Array<...>", () => {
  const out = generate({
    schema: SCHEMA,
    document: "query Q { things { id } }",
  });

  assert.equal(
    resultType(out),
    `{
  things: Array<{
  id: string;
}>;
}`,
  );
});

test("nesting works to arbitrary depth", () => {
  const out = generate({
    schema: SCHEMA,
    document: "query Q { thing { child { child { id } } } }",
  });

  assert.equal(
    resultType(out),
    `{
  thing: {
  child: {
  child: {
  id: string;
} | null;
} | null;
};
}`,
  );
});

test("field aliases rename the key in the result type", () => {
  const out = generate({
    schema: SCHEMA,
    document: "query Q { renamedThing: thing { theId: id } }",
  });

  assert.equal(
    resultType(out),
    `{
  renamedThing: {
  theId: string;
};
}`,
  );
});

test("__typename on a concrete object type is that type's name literal", () => {
  const out = generate({
    schema: SCHEMA,
    document: "query Q { thing { __typename id } }",
  });

  assert.equal(
    resultType(out),
    `{
  thing: {
  __typename: "Thing";
  id: string;
};
}`,
  );
});

test("fields not present in the schema are silently skipped", () => {
  // The plugin guards `if (!fieldDef) continue;` — a typo'd field just drops
  // out of the result type rather than crashing.
  const out = generate({
    schema: SCHEMA,
    document: "query Q { thing { id doesNotExist } }",
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
