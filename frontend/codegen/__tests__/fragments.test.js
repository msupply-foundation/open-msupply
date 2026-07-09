/**
 * Fragments, inline fragments, unions and interfaces.
 *
 * Two important behaviours, both pinned down below:
 *
 *  1. Each fragment is emitted as its own reusable type, `<Name>Fragment`. Where
 *     a fragment is spread, the result REFERENCES that type (rather than copying
 *     the fields), so the fragment stays the single source of truth.
 *
 *  2. Inline fragments on a union/interface produce a DISCRIMINATED UNION:
 *     `({ __typename: "A" } & { ...A }) | ({ __typename: "B" } & { ...B })`.
 *     Each branch carries its concrete `__typename` literal plus any shared
 *     fields selected outside the inline fragments.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { generate, resultType, fragmentType } = require("./helpers.js");

test("a fragment is emitted as its own <Name>Fragment type", () => {
  const schema = `
    type Query { thing: Thing! }
    type Thing { id: ID! name: String }
  `;
  const out = generate({
    schema,
    document: `
      query Q { thing { ...ThingFields } }
      fragment ThingFields on Thing { id name }
    `,
  });

  // The fragment type exists and holds the fragment's fields...
  assert.equal(
    fragmentType(out, "ThingFields"),
    `{
  id: string;
  name: string | null;
}`,
  );
  // ...and the operation REFERENCES it rather than inlining the fields.
  assert.equal(
    resultType(out, "Q"),
    `{
  thing: ThingFieldsFragment;
}`,
  );
});

test("a spread plus sibling fields → intersection of fields & fragment type", () => {
  const schema = `
    type Query { thing: Thing! }
    type Thing { id: ID! name: String extra: String }
  `;
  const out = generate({
    schema,
    document: `
      query Q { thing { ...Base extra } }
      fragment Base on Thing { id name }
    `,
  });

  assert.equal(
    resultType(out, "Q"),
    `{
  thing: {
  extra: string | null;
} & BaseFragment;
}`,
  );
});

test("fragments referencing other fragments reference each other's types", () => {
  const schema = `
    type Query { thing: Thing! }
    type Thing { id: ID! child: Thing }
  `;
  const out = generate({
    schema,
    document: `
      query Q { thing { ...Outer } }
      fragment Outer on Thing { id child { ...Inner } }
      fragment Inner on Thing { id }
    `,
  });

  // Outer references Inner by type (TS hoists types so order doesn't matter).
  assert.equal(
    fragmentType(out, "Outer"),
    `{
  id: string;
  child: InnerFragment | null;
}`,
  );
  assert.equal(fragmentType(out, "Inner"), `{\n  id: string;\n}`);
  assert.equal(resultType(out, "Q"), `{\n  thing: OuterFragment;\n}`);
});

test("a missing fragment spread is skipped (no crash)", () => {
  // The plugin guards spreads whose definition isn't present in the documents.
  const schema = `
    type Query { thing: Thing! }
    type Thing { id: ID! }
  `;
  const out = generate({
    schema,
    document: "query Q { thing { id ...NotDefined } }",
  });

  assert.equal(resultType(out, "Q"), `{\n  thing: {\n  id: string;\n};\n}`);
});

test("inline fragments on a union become a DISCRIMINATED union", () => {
  const schema = `
    type Query { search: SearchResult! }
    type Author { id: ID! name: String! }
    type Book { id: ID! title: String! }
    union SearchResult = Author | Book
  `;
  const out = generate({
    schema,
    document: `
      query Q {
        search {
          __typename
          ... on Author { name }
          ... on Book { title }
        }
      }
    `,
  });

  assert.equal(
    resultType(out, "Q"),
    `{
  search: ({
  __typename: "Author";
} & {
  name: string;
}) | ({
  __typename: "Book";
} & {
  title: string;
});
}`,
  );
});

test("interface branches carry the concrete __typename plus shared fields", () => {
  const schema = `
    type Query { node: Node! }
    interface Node { id: ID! }
    type User implements Node { id: ID! email: String! }
    type Org implements Node { id: ID! orgName: String! }
  `;
  const out = generate({
    schema,
    document: `
      query Q {
        node {
          __typename
          id
          ... on User { email }
          ... on Org { orgName }
        }
      }
    `,
  });

  // `id` is selected outside the inline fragments → it appears in BOTH branches.
  assert.equal(
    resultType(out, "Q"),
    `{
  node: ({
  __typename: "User";
} & {
  email: string;
} & {
  id: string;
}) | ({
  __typename: "Org";
} & {
  orgName: string;
} & {
  id: string;
});
}`,
  );
});

test("a fragment defined ON a union is itself a discriminated union type", () => {
  const schema = `
    type Query { search: SearchResult! }
    type Author { id: ID! name: String! }
    type Book { id: ID! title: String! }
    union SearchResult = Author | Book
  `;
  const out = generate({
    schema,
    document: `
      query Q { search { ...Res } }
      fragment Res on SearchResult {
        __typename
        ... on Author { name }
        ... on Book { title }
      }
    `,
  });

  assert.equal(
    fragmentType(out, "Res"),
    `({
  __typename: "Author";
} & {
  name: string;
}) | ({
  __typename: "Book";
} & {
  title: string;
})`,
  );
  assert.equal(resultType(out, "Q"), `{\n  search: ResFragment;\n}`);
});

test("a union branch can reference a fragment spread", () => {
  const schema = `
    type Query { search: SearchResult! }
    type Author { id: ID! name: String! }
    type Book { id: ID! title: String! }
    union SearchResult = Author | Book
  `;
  const out = generate({
    schema,
    document: `
      query Q {
        search {
          __typename
          ... on Author { ...AuthorBits }
          ... on Book { title }
        }
      }
      fragment AuthorBits on Author { id name }
    `,
  });

  assert.equal(
    resultType(out, "Q"),
    `{
  search: ({
  __typename: "Author";
} & AuthorBitsFragment) | ({
  __typename: "Book";
} & {
  title: string;
});
}`,
  );
});
