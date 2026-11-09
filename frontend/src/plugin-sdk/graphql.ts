/*
 * The plugin data-access surface over the core schema
 * (spec/plugins/sdk-contract.md § data access).
 *
 * `graphqlQuery` IS the host's `graphqlFetch` — not a wrapper. It never throws:
 * every call returns a discriminated `GraphqlResult` the caller matches on
 * `kind` (kdd/state-management), and infra failures already route to the
 * host's global error surfaces, so a contribution only decides what to render.
 * Plugin operations are code-generated against the same exported schema, so a
 * `TypedDocument` from a plugin's own codegen fits without a cast.
 */
export { graphqlFetch as graphqlQuery } from '../api/graphql';
export type {
  TypedDocument,
  GraphqlResult,
  GraphqlFailure,
  GraphqlErrorItem,
} from '../api/graphql';
