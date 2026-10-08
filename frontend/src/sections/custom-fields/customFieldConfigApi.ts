import { graphqlFetch } from '../../api/graphql';
import {
  CustomFieldScopeConfig,
  UpdateCustomFieldScopes,
} from './customFieldConfig.generated';
import type { ConfigRow, PendingChanges } from './placement';
import { configRows, pendingUpdates } from './placement';

// The vertical's two calls, in the fixed data-access shape
// (kdd/state-management: the never-throwing query method, a discriminated
// result, refresh by direct call). No cache keys, no client library.

/** One scope's configuration, or the read having failed. */
export type ConfigRead =
  | { kind: 'ok'; scope: string; rows: ConfigRow[] }
  | { kind: 'error'; scope: string };

/**
 * Read one scope's configuration — the ONLY read that keeps out-of-sight fields
 * (spec/custom-fields rules § what the screen lists).
 *
 * Failures are NOT swallowed into an empty list: an empty scope and a failed
 * read say different things on screen (the empty state vs. the shared
 * data-error message — ui-surface S1), so the result distinguishes them.
 * Default error handling is deliberate: a Forbidden routes to the
 * permission-denied modal and any other GraphQL error to the unexpected-error
 * modal — the generic error path ui-surface S4 prescribes for the not-central
 * / not-admin cases, which the route gate makes unreachable anyway.
 */
export const readScopeConfig = async (scope: string): Promise<ConfigRead> => {
  const result = await graphqlFetch(CustomFieldScopeConfig, { scope });
  if (result.kind !== 'success') return { kind: 'error', scope };
  return {
    kind: 'ok',
    scope,
    rows: configRows(
      result.data.centralServer.customField.customFieldScopeConfig.nodes
    ),
  };
};

/**
 * The outcome of a save. `nothing-to-save` is not an error — an empty update
 * list is accepted by the wire and behaves as a read, so the screen simply
 * never sends one.
 */
export type SaveOutcome =
  | { kind: 'saved'; rows: ConfigRow[] }
  | { kind: 'nothing-to-save' }
  | { kind: 'error' };

/**
 * Save one scope's pending placements (spec/custom-fields rules § choosing and
 * saving). All-or-nothing is the service's transaction, not a client rollback:
 * a rejected element undoes the rest.
 *
 * `returnGraphqlErrors` because the ONE real rejection is untyped — a top-level
 * "Bad user input" carrying `ScopeRowDoesNotExist("<id>")` in
 * `extensions.details`, with the whole centralServer selection null. Reading it
 * here keeps it off the global modal so the screen can show its inline notice
 * and KEEP the pending changes to retry (D21, D79's precedent).
 *
 * The response carries the whole scope's fresh configuration, so a success
 * needs no re-read: the caller reseeds its rows from `rows`.
 */
export const saveScopePlacements = async (
  scope: string,
  rows: readonly ConfigRow[],
  pending: PendingChanges
): Promise<SaveOutcome> => {
  const updates = pendingUpdates(rows, pending);
  if (updates.length === 0) return { kind: 'nothing-to-save' };
  const result = await graphqlFetch(
    UpdateCustomFieldScopes,
    { input: { scope, updates } },
    { returnGraphqlErrors: true }
  );
  if (result.kind !== 'success') return { kind: 'error' };
  return {
    kind: 'saved',
    rows: configRows(result.data.centralServer.customField.updateScopes.nodes),
  };
};
