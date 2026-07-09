/**
 * Fragments exposed as their own reusable types.
 *
 * Every fragment in a document becomes `export type <Name>Fragment = {...}`,
 * emitted before the operations. Where a fragment is spread, the referencing
 * type points at `<Name>Fragment` instead of copying the fields — so a fragment
 * is defined once and can be imported and reused on its own.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { generate, resultType, fragmentType } = require("./helpers.js");

test("each fragment is emitted as an exported <Name>Fragment type", () => {
  const schema = `type Query { u: User! } type User { id: ID! name: String! }`;
  const out = generate({
    schema,
    document: "query Q { u { ...UserCard } } fragment UserCard on User { id name }",
  });

  assert.ok(out.includes("export type UserCardFragment ="));
  assert.equal(
    fragmentType(out, "UserCard"),
    `{
  id: string;
  name: string;
}`,
  );
});

test("fragment names are PascalCased just like operation names", () => {
  const schema = `type Query { u: User! } type User { id: ID! }`;
  const out = generate({
    schema,
    document: "query Q { u { ...userCard } } fragment userCard on User { id }",
  });

  assert.ok(out.includes("export type UserCardFragment ="));
});

test("a fragment's own nested selections are preserved in its type", () => {
  const schema = `
    type Query { u: User! }
    type User { id: ID! address: Address }
    type Address { city: String! zip: String }
  `;
  const out = generate({
    schema,
    document:
      "query Q { u { ...UserCard } } fragment UserCard on User { id address { city zip } }",
  });

  assert.equal(
    fragmentType(out, "UserCard"),
    `{
  id: string;
  address: {
  city: string;
  zip: string | null;
} | null;
}`,
  );
});

test("the same fragment used by two operations is defined once, referenced twice", () => {
  const schema = `type Query { a: User! b: User! } type User { id: ID! name: String! }`;
  const out = generate({
    schema,
    document: `
      query First { a { ...U } }
      query Second { b { ...U } }
      fragment U on User { id name }
    `,
  });

  // Exactly one type declaration...
  assert.equal((out.match(/export type UFragment =/g) || []).length, 1);
  // ...referenced by both operations.
  assert.equal(resultType(out, "First"), `{\n  a: UFragment;\n}`);
  assert.equal(resultType(out, "Second"), `{\n  b: UFragment;\n}`);
});

test("a fragment that is never spread is still emitted as a type", () => {
  // Fragment types are always exported (so they can be imported standalone),
  // even if no operation in this document uses them.
  const schema = `type Query { a: User! } type User { id: ID! name: String! }`;
  const out = generate({
    schema,
    document: "query Q { a { id } } fragment Unused on User { id name }",
  });

  assert.ok(out.includes("export type UnusedFragment ="));
  assert.equal(
    fragmentType(out, "Unused"),
    `{
  id: string;
  name: string;
}`,
  );
});

test("fragment types are emitted before the operations that use them", () => {
  const schema = `type Query { u: User! } type User { id: ID! }`;
  const out = generate({
    schema,
    document: "query Q { u { ...UserCard } } fragment UserCard on User { id }",
  });

  const fragIdx = out.indexOf("export type UserCardFragment =");
  const opIdx = out.indexOf("export type QResult =");
  assert.ok(fragIdx !== -1 && opIdx !== -1);
  assert.ok(fragIdx < opIdx, "fragment type should come before the operation type");
});
