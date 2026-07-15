/**
 * Custom graphql-codegen plugin.
 *
 * For each fragment in a .graphql document it emits:
 *   - export type <Name>Fragment = { ... }   (reusable, referenced where spread)
 *
 * For each operation it emits:
 *   - export type <Name>Variables = { ... }  (from the operation's variable defs)
 *   - export type <Name>Result = { ... }     (walked against the schema for accurate nullability)
 *   - export const <Name> = { query } as TypedDocument<Result, Variables>
 *
 * (<Name> is the operation/fragment name PascalCased.)
 *
 * It deliberately avoids the official @graphql-codegen/typescript plugins so the
 * project keeps a single, readable code path. Types are derived from the schema
 * AST, so nullability / scalars are accurate.
 *
 * Two behaviours worth knowing:
 *   - Inline fragments on a union/interface produce a DISCRIMINATED union
 *     (`{ __typename: "A"; ... } | { __typename: "B"; ... }`), not a flat merge.
 *   - Fragment spreads are referenced by their `<Name>Fragment` type
 *     (intersected with any sibling fields), so fragments stay DRY and reusable.
 */
const {
  Kind,
  isNonNullType,
  isListType,
  isScalarType,
  isEnumType,
  isObjectType,
  print,
  validate,
  specifiedRules,
  NoUnusedFragmentsRule,
} = require("graphql");

/**
 * Validate the documents against the schema before generating: a document the
 * server would reject at request time must fail codegen, with the file and
 * field named in the error.
 *
 * Mirrors graphql-tools' validateGraphQlDocuments (what @graphql-codegen/cli
 * runs): all documents are validated together so fragments defined in one
 * document resolve in another, and NoUnusedFragments is dropped so a shared
 * fragment-only document is legal.
 */
function validateDocuments(schema, documents) {
  const combined = {
    kind: Kind.DOCUMENT,
    definitions: documents.flatMap((doc) => doc.document.definitions),
  };
  const rules = specifiedRules.filter((rule) => rule !== NoUnusedFragmentsRule);
  const errors = validate(schema, combined, rules);
  if (errors.length > 0) {
    const locations = documents.map((doc) => doc.location).filter(Boolean);
    throw new Error(
      `GraphQL validation failed${locations.length ? ` (${locations.join(", ")})` : ""}:\n` +
        errors.map((e) => `  - ${e.message}`).join("\n")
    );
  }
}

/** Map GraphQL scalar names to TS types. Unknown scalars fall back to string. */
const SCALAR_MAP = {
  ID: "string",
  String: "string",
  Boolean: "boolean",
  Int: "number",
  Float: "number",
  NaiveDate: "string",
  DateTime: "string",
};

/** PascalCase a name (operation/fragment names are usually camelCase). */
function pascal(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function tsForNamedType(type) {
  if (isScalarType(type)) {
    return SCALAR_MAP[type.name] ?? "string";
  }
  if (isEnumType(type)) {
    return type.getValues().map((v) => JSON.stringify(v.value)).join(" | ");
  }
  // Object / interface / union handled by the selection-set walker, not here.
  return "unknown";
}

/** Render a TS type for a GraphQL output type, wrapping a pre-rendered inner body. */
function wrapType(type, innerBody) {
  if (isNonNullType(type)) {
    return stripNull(wrapType(type.ofType, innerBody));
  }
  if (isListType(type)) {
    return `Array<${wrapType(type.ofType, innerBody)}>` + " | null";
  }
  // Nullable leaf
  return `${innerBody} | null`;
}

function stripNull(rendered) {
  return rendered.endsWith(" | null") ? rendered.slice(0, -" | null".length) : rendered;
}

function getNamedType(type) {
  let t = type;
  while (t.ofType) t = t.ofType;
  return t;
}

/**
 * Render a TS object body for a plain list of FIELD selections against an
 * object/interface type. (No inline-fragment branching here — that's handled by
 * the caller in renderSelectionSet.) Returns `{\n  field: type;\n  ...\n}`.
 *
 * @param objectFields  array of FIELD selection nodes
 * @param parentType    the GraphQL object/interface type they belong to
 */
function renderFields(objectFields, parentType, schema, fragments) {
  const lines = [];
  for (const sel of objectFields) {
    const fieldName = sel.name.value;
    if (fieldName === "__typename") {
      // Discriminant. When this is a concrete object type, narrow to a literal;
      // otherwise (abstract type with no branches) keep it as string.
      const literal = isObjectType(parentType) ? JSON.stringify(parentType.name) : "string";
      lines.push(`  __typename: ${literal};`);
      continue;
    }
    // Unions have no fields of their own (only __typename is selectable at the
    // top level), so guard getFields. Unknown fields can't reach here — they
    // fail validateDocuments before generation starts.
    const fieldDef = parentType.getFields ? parentType.getFields()[fieldName] : undefined;
    if (!fieldDef) continue;
    const alias = sel.alias ? sel.alias.value : fieldName;
    const fieldType = fieldDef.type;
    const namedType = getNamedType(fieldType);

    let rendered;
    if (sel.selectionSet) {
      const body = renderSelectionSet(sel.selectionSet, namedType, schema, fragments);
      rendered = wrapType(fieldType, body);
    } else {
      rendered = wrapType(fieldType, tsForNamedType(namedType));
    }
    lines.push(`  ${alias}: ${rendered};`);
  }
  return `{\n${lines.join("\n")}\n}`;
}

/**
 * Walk a selection set against its GraphQL type, returning a TS type.
 *
 * - Direct fields and fragment spreads contribute to a "base" object.
 * - Fragment spreads are referenced by their `<Name>Fragment` type (intersected
 *   with the base), so the fragment definition stays the single source of truth.
 * - Inline fragments WITH a type condition on a different type become separate
 *   union branches (discriminated). Inline fragments with no/own type condition
 *   are merged into the base.
 *
 * Result shapes:
 *   - just fields:                 `{ ... }`
 *   - fields + spread(s):          `{ ... } & FooFragment`
 *   - inline fragments (branches): `(base & { ...A }) | (base & { ...B })`
 */
function renderSelectionSet(selectionSet, parentType, schema, fragments) {
  const directFields = [];
  const spreadRefs = []; // `<Name>Fragment` type references
  const branches = []; // inline fragments on a more specific type → union members

  for (const sel of selectionSet.selections) {
    if (sel.kind === Kind.FIELD) {
      directFields.push(sel);
    } else if (sel.kind === Kind.FRAGMENT_SPREAD) {
      const frag = fragments[sel.name.value];
      if (!frag) continue;
      spreadRefs.push(`${pascal(sel.name.value)}Fragment`);
    } else if (sel.kind === Kind.INLINE_FRAGMENT) {
      const condName = sel.typeCondition && sel.typeCondition.name.value;
      // No type condition, or condition equal to the parent type → merge into base.
      if (!condName || condName === parentType.name) {
        for (const inner of sel.selectionSet.selections) {
          if (inner.kind === Kind.FIELD) directFields.push(inner);
          else if (inner.kind === Kind.FRAGMENT_SPREAD && fragments[inner.name.value]) {
            spreadRefs.push(`${pascal(inner.name.value)}Fragment`);
          } else if (inner.kind === Kind.INLINE_FRAGMENT) {
            branches.push(inner);
          }
        }
      } else {
        branches.push(sel);
      }
    }
  }

  // Was __typename selected at this level? With branches, the discriminant moves
  // INTO each branch (as a concrete-type literal), so we render the base without
  // it and let each branch supply its own.
  const baseSelectedTypename = directFields.some(
    (f) => f.name.value === "__typename",
  );

  if (branches.length === 0) {
    // No union: plain object body (+ any spread fragment intersections).
    const baseBody = renderFields(directFields, parentType, schema, fragments);
    return intersect(baseBody, spreadRefs);
  }

  // Discriminated union: render shared (base) fields once, then one member per
  // branch with its concrete-type __typename literal.
  const sharedFields = directFields.filter((f) => f.name.value !== "__typename");
  const sharedBody = renderFields(sharedFields, parentType, schema, fragments);
  const sharedRefs = intersect(sharedBody, spreadRefs);
  const sharedParts =
    sharedRefs === EMPTY_OBJECT ? [] : splitIntersection(sharedRefs);

  const members = branches.map((br) => {
    const condType = br.typeCondition
      ? schema.getType(br.typeCondition.name.value)
      : parentType;
    const branchBody = renderSelectionSet(br.selectionSet, condType, schema, fragments);
    // The discriminant literal for this concrete branch type.
    const typenameField = baseSelectedTypename
      ? `{\n  __typename: ${JSON.stringify(condType.name)};\n}`
      : null;
    const parts = [
      ...(typenameField ? [typenameField] : []),
      branchBody,
      ...sharedParts,
    ].filter((p) => p !== EMPTY_OBJECT);
    const member = parts.length ? parts.join(" & ") : EMPTY_OBJECT;
    // Parenthesise so the `&`-vs-`|` precedence is explicit and readable.
    return `(${member})`;
  });

  return members.join(" | ");
}

/** Split an `A & B & C` string back into its parts (best-effort, top-level). */
function splitIntersection(rendered) {
  // Our intersections only join object-literals and bare identifiers with " & ".
  // Object literals contain newlines, identifiers don't, so a simple split on
  // " & " at brace-depth 0 is sufficient for what this plugin produces.
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < rendered.length; i++) {
    const c = rendered[i];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (depth === 0 && rendered.startsWith(" & ", i)) {
      parts.push(rendered.slice(start, i));
      i += 2;
      start = i + 1;
    }
  }
  parts.push(rendered.slice(start));
  return parts;
}

const EMPTY_OBJECT = "{\n\n}";

/** Intersect a base object body with zero or more type references. */
function intersect(baseBody, refs) {
  if (refs.length === 0) return baseBody;
  // If the base object has no own fields, drop it from the intersection.
  if (baseBody === EMPTY_OBJECT) {
    return refs.length === 1 ? refs[0] : refs.join(" & ");
  }
  return [baseBody, ...refs].join(" & ");
}

/** Render a TS type for an input/variable type node (from variable definitions). */
function renderInputType(typeNode, schema) {
  if (typeNode.kind === Kind.NON_NULL_TYPE) {
    return { ts: stripNull(renderInputType(typeNode.type, schema).ts), nonNull: true };
  }
  if (typeNode.kind === Kind.LIST_TYPE) {
    const inner = renderInputType(typeNode.type, schema);
    return { ts: `Array<${inner.ts}> | null`, nonNull: false };
  }
  // NAMED_TYPE
  const name = typeNode.name.value;
  const namedType = schema.getType(name);
  let ts;
  if (namedType && isScalarType(namedType)) {
    ts = SCALAR_MAP[name] ?? "string";
  } else if (namedType && isEnumType(namedType)) {
    ts = namedType.getValues().map((v) => JSON.stringify(v.value)).join(" | ");
  } else if (namedType && namedType.getFields) {
    // Input object type — render its fields.
    const fields = namedType.getFields();
    const inner = Object.values(fields)
      .map((f) => {
        const r = renderInputTypeFromGraphQLType(f.type, schema);
        const optional = r.nonNull ? "" : "?";
        return `    ${f.name}${optional}: ${r.ts};`;
      })
      .join("\n");
    ts = `{\n${inner}\n  }`;
  } else {
    ts = "unknown";
  }
  return { ts: `${ts} | null`, nonNull: false };
}

/** Same as renderInputType but starting from a GraphQL type object (not an AST node). */
function renderInputTypeFromGraphQLType(type, schema) {
  if (isNonNullType(type)) {
    return { ts: stripNull(renderInputTypeFromGraphQLType(type.ofType, schema).ts), nonNull: true };
  }
  if (isListType(type)) {
    const inner = renderInputTypeFromGraphQLType(type.ofType, schema);
    return { ts: `Array<${inner.ts}> | null`, nonNull: false };
  }
  let ts;
  if (isScalarType(type)) {
    ts = SCALAR_MAP[type.name] ?? "string";
  } else if (isEnumType(type)) {
    ts = type.getValues().map((v) => JSON.stringify(v.value)).join(" | ");
  } else if (type.getFields) {
    const fields = type.getFields();
    const inner = Object.values(fields)
      .map((f) => {
        const r = renderInputTypeFromGraphQLType(f.type, schema);
        const optional = r.nonNull ? "" : "?";
        return `    ${f.name}${optional}: ${r.ts};`;
      })
      .join("\n");
    ts = `{\n${inner}\n  }`;
  } else {
    ts = "unknown";
  }
  return { ts: `${ts} | null`, nonNull: false };
}

function renderVariables(operation, schema) {
  const defs = operation.variableDefinitions ?? [];
  if (defs.length === 0) return "Record<string, never>";
  const lines = defs.map((def) => {
    const name = def.variable.name.value;
    const r = renderInputType(def.type, schema);
    const optional = r.nonNull ? "" : "?";
    return `  ${name}${optional}: ${r.ts};`;
  });
  return `{\n${lines.join("\n")}\n}`;
}

/** Collect fragment names reachable from a selection set (for inlining the doc text). */
function collectFragments(selectionSet, fragments, acc) {
  for (const sel of selectionSet.selections) {
    if (sel.kind === Kind.FRAGMENT_SPREAD) {
      const name = sel.name.value;
      if (!acc.has(name) && fragments[name]) {
        acc.add(name);
        collectFragments(fragments[name].selectionSet, fragments, acc);
      }
    } else if (sel.selectionSet) {
      collectFragments(sel.selectionSet, fragments, acc);
    }
  }
  return acc;
}

module.exports = {
  plugin(schema, documents, config) {
    // Refuse to generate from documents the server would reject at runtime.
    validateDocuments(schema, documents);
    // Import path for TypedDocument, relative to where this .generated.ts lands
    // (run.js computes it per file). Defaults to co-location with graphql.ts.
    const graphqlImport = (config && config.graphqlImport) || "./graphql";
    // Gather all fragment definitions across documents.
    const fragments = {};
    for (const doc of documents) {
      for (const def of doc.document.definitions) {
        if (def.kind === Kind.FRAGMENT_DEFINITION) {
          fragments[def.name.value] = def;
        }
      }
    }

    const out = [
      "/* eslint-disable */",
      "// THIS FILE IS GENERATED by codegen/plugin.js — do not edit by hand.",
      `import type { TypedDocument } from "${graphqlImport}";`,
      "",
    ];

    // --- Fragment types (emitted first so operations can reference them) ---
    // Order by declaration across all documents.
    for (const doc of documents) {
      for (const def of doc.document.definitions) {
        if (def.kind !== Kind.FRAGMENT_DEFINITION) continue;
        const fragName = pascal(def.name.value);
        const onType = schema.getType(def.typeCondition.name.value);
        const body = renderSelectionSet(def.selectionSet, onType, schema, fragments);
        out.push(`export type ${fragName}Fragment = ${body};`);
        out.push("");
      }
    }

    // --- Operations ---
    for (const doc of documents) {
      for (const def of doc.document.definitions) {
        if (def.kind !== Kind.OPERATION_DEFINITION || !def.name) continue;
        const name = def.name.value;
        const Name = pascal(name);
        const rootType =
          def.operation === "query"
            ? schema.getQueryType()
            : def.operation === "mutation"
              ? schema.getMutationType()
              : schema.getSubscriptionType();

        // --- Result type ---
        const resultBody = renderSelectionSet(def.selectionSet, rootType, schema, fragments);

        // --- Variables type ---
        const variablesBody = renderVariables(def, schema);

        // --- Document string (operation + its reachable fragments) ---
        const used = collectFragments(def.selectionSet, fragments, new Set());
        const parts = [print(def)];
        for (const fragName of used) parts.push(print(fragments[fragName]));
        const docText = parts.join("\n\n");

        out.push(`export type ${Name}Variables = ${variablesBody};`);
        out.push("");
        out.push(`export type ${Name}Result = ${resultBody};`);
        out.push("");
        // Grouped, type-bound document: query string + phantom Result/Variables.
        out.push(
          `export const ${Name} = {\n` +
            `  query: ${JSON.stringify(docText)},\n` +
            `} as TypedDocument<${Name}Result, ${Name}Variables>;`,
        );
        out.push("");
      }
    }

    return out.join("\n");
  },
};
