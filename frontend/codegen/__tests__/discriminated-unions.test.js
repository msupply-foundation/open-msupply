/**
 * Discriminated unions (the headline feature).
 *
 * When a selection set has inline fragments on a union or interface, the plugin
 * emits a DISTINCT union type — one member per branch — rather than flattening
 * everything into one object. Each branch is:
 *
 *   ({ __typename: "<ConcreteType>" } & { ...that branch's fields })
 *
 * The `__typename` literal is the discriminant, so `switch (x.__typename)` /
 * narrowing works at the call site. Any fields selected OUTSIDE the inline
 * fragments (shared fields) are intersected into every branch.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { generate, resultType, fragmentType } = require("./helpers.js");

const UNION_SCHEMA = `
  type Query { r: R! rs: [R!]! }
  type Cat { id: ID! meow: String! }
  type Dog { id: ID! bark: Int! }
  type Fish { id: ID! bubbles: Boolean! }
  union R = Cat | Dog | Fish
`;

test("two branches → a two-member discriminated union", () => {
  const out = generate({
    schema: `
      type Query { r: R! }
      type Cat { meow: String! }
      type Dog { bark: Int! }
      union R = Cat | Dog
    `,
    document: "query Q { r { __typename ... on Cat { meow } ... on Dog { bark } } }",
  });

  assert.equal(
    resultType(out, "Q"),
    `{
  r: ({
  __typename: "Cat";
} & {
  meow: string;
}) | ({
  __typename: "Dog";
} & {
  bark: number;
});
}`,
  );
});

test("three branches → a three-member union", () => {
  const out = generate({
    schema: UNION_SCHEMA,
    document: `
      query Q {
        r {
          __typename
          ... on Cat { meow }
          ... on Dog { bark }
          ... on Fish { bubbles }
        }
      }
    `,
  });

  assert.equal(
    resultType(out, "Q"),
    `{
  r: ({
  __typename: "Cat";
} & {
  meow: string;
}) | ({
  __typename: "Dog";
} & {
  bark: number;
}) | ({
  __typename: "Fish";
} & {
  bubbles: boolean;
});
}`,
  );
});

test("shared interface fields (selected outside the branches) appear in every branch", () => {
  // On an interface you can select shared fields (`id`) directly alongside the
  // per-type inline fragments. Those shared fields land in every branch.
  const out = generate({
    schema: `
      type Query { animal: Animal! }
      interface Animal { id: ID! }
      type Cat implements Animal { id: ID! meow: String! }
      type Dog implements Animal { id: ID! bark: Int! }
    `,
    document: `
      query Q {
        animal {
          __typename
          id
          ... on Cat { meow }
          ... on Dog { bark }
        }
      }
    `,
  });

  assert.equal(
    resultType(out, "Q"),
    `{
  animal: ({
  __typename: "Cat";
} & {
  meow: string;
} & {
  id: string;
}) | ({
  __typename: "Dog";
} & {
  bark: number;
} & {
  id: string;
});
}`,
  );
});

test("without __typename, branches have no discriminant literal", () => {
  const out = generate({
    schema: UNION_SCHEMA,
    document: "query Q { r { ... on Cat { meow } ... on Dog { bark } } }",
  });

  assert.equal(
    resultType(out, "Q"),
    `{
  r: ({
  meow: string;
}) | ({
  bark: number;
});
}`,
  );
});

test("a union inside a list wraps the union in Array<...>", () => {
  const out = generate({
    schema: UNION_SCHEMA,
    document: "query Q { rs { __typename ... on Cat { meow } ... on Dog { bark } } }",
  });

  assert.equal(
    resultType(out, "Q"),
    `{
  rs: Array<({
  __typename: "Cat";
} & {
  meow: string;
}) | ({
  __typename: "Dog";
} & {
  bark: number;
})>;
}`,
  );
});

test("selecting only one branch still yields a (parenthesised) union member", () => {
  const out = generate({
    schema: UNION_SCHEMA,
    document: "query Q { r { __typename ... on Cat { meow } } }",
  });

  assert.equal(
    resultType(out, "Q"),
    `{
  r: ({
  __typename: "Cat";
} & {
  meow: string;
});
}`,
  );
});

test("a branch's fields can come from a fragment spread (referenced by type)", () => {
  const out = generate({
    schema: UNION_SCHEMA,
    document: `
      query Q {
        r {
          __typename
          ... on Cat { ...CatBits }
          ... on Dog { bark }
        }
      }
      fragment CatBits on Cat { id meow }
    `,
  });

  assert.equal(fragmentType(out, "CatBits"), `{\n  id: string;\n  meow: string;\n}`);
  assert.equal(
    resultType(out, "Q"),
    `{
  r: ({
  __typename: "Cat";
} & CatBitsFragment) | ({
  __typename: "Dog";
} & {
  bark: number;
});
}`,
  );
});
