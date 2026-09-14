import {
  graphqlFetch,
  isForbidden,
  missingPermissions,
  reportPermissionDenied,
  type GraphqlErrorItem,
  type GraphqlResult,
} from '../../api/graphql';
import { rejectionFrom, type Rejection } from '../../api/rejection';
import {
  DemographicIndicators,
  DemographicProjectionByBaseYear,
  InsertDemographicIndicator,
  InsertDemographicProjection,
  UpdateDemographicIndicator,
  UpdateDemographicProjection,
} from './demographics.generated';
import {
  BASE_YEAR,
  type Indicator,
  type ProjectionNode,
  type SaveInputs,
} from './draft';

// The vertical's reads and writes, in the fixed data-access shape
// (kdd/state-management: the never-throwing query method, a discriminated
// result, refresh by direct call). No cache keys, no client library.

/** What the grid loads: every indicator, and the base year's stored rates. */
export type LoadedDemographics = {
  indicators: Indicator[];
  /** Undefined when no growth-rate record exists for the base year yet. */
  projection: ProjectionNode | undefined;
};

/**
 * Load the grid (spec/demographics contract § the grid): the indicators, whole,
 * and the growth rates for the screen's base year, in parallel. Resolves once
 * BOTH have answered — the loading spinner holds until then (ui-surface S1 §
 * states).
 *
 * `storeId` is the read's auth plumbing, not a filter: the data is
 * installation-wide (contract wire trap).
 *
 * The absent-rates case is the typed `RecordNotFound` miss, read as "no record
 * yet": zero rates, and the first Save creates the record. Any OTHER NodeError
 * is promoted to the global unexpected-error modal, like a transport failure —
 * the default handling also covers a failed indicator read — and the load
 * resolves undefined, leaving the screen in its loading shape with nothing to
 * edit.
 */
export const loadDemographics = async (
  storeId: string
): Promise<LoadedDemographics | undefined> => {
  const [indicators, projection] = await Promise.all([
    graphqlFetch(DemographicIndicators, { storeId }),
    graphqlFetch(
      DemographicProjectionByBaseYear,
      { baseYear: BASE_YEAR },
      {
        mapSuccessToError: data => {
          const node = data.demographicProjectionByBaseYear;
          return node.__typename === 'NodeError' &&
            node.error.__typename !== 'RecordNotFound'
            ? node.error.description
            : undefined;
        },
      }
    ),
  ]);
  if (indicators.kind !== 'success' || projection.kind !== 'success')
    return undefined;
  const node = projection.data.demographicProjectionByBaseYear;
  return {
    indicators: indicators.data.demographicIndicators.nodes,
    projection:
      node.__typename === 'DemographicProjectionNode' ? node : undefined,
  };
};

/**
 * The outcome of one Save (rules § saving the draft).
 *
 * `acceptedNewIds` names the NEW rows the server accepted, whatever else
 * happened: rows persist independently, so after a partial save those rows
 * exist and a retry must UPDATE them, not insert them again — the caller flips
 * them off `isNew`.
 */
export type SaveOutcome =
  | { kind: 'saved' }
  /** A row or the rates was refused for a domain reason; the notice shows
   * it. */
  | { kind: 'rejected'; rejection: Rejection; acceptedNewIds: string[] }
  /**
   * Refused as no permission (the server's own refusal — the permission-denied
   * modal has been raised) or failed in transport (the unexpected-error modal
   * has). Nothing for the screen to show; it releases its busy state and keeps
   * the draft.
   */
  | { kind: 'failed'; acceptedNewIds: string[] };

type Failure =
  | { kind: 'forbidden'; errors: GraphqlErrorItem[] }
  | { kind: 'rejected'; errors: GraphqlErrorItem[] }
  | { kind: 'failed' };

// One result's failure, if any. A GraphQL error is the server's refusal —
// Forbidden (no permission) or a domain rejection; anything else (transport,
// unauthenticated, aborted) has already been reported through the global
// signals and is simply a failure here.
const failure = (result: GraphqlResult<unknown>): Failure | undefined => {
  if (result.kind === 'success') return undefined;
  if (result.kind !== 'graphqlError') return { kind: 'failed' };
  return isForbidden(result.errors)
    ? { kind: 'forbidden', errors: result.errors }
    : { kind: 'rejected', errors: result.errors };
};

/**
 * Why a write was refused (contract § rejections). The reason arrives UNTYPED:
 * a top-level GraphQL error whose `extensions.details` is the service's variant
 * name (`DemographicIndicatorAlreadyExistsForThisYear`), which `server-error.*`
 * translates and whose raw text stays behind the notice's disclosure. The
 * off-central refusal arrives the same way with the plain text
 * "Not a central server", which the fallback shows as-is. Only the FIRST
 * failure is reported: the reference client surfaces one reason too, and a
 * batch of parallel rows rarely fails for more than one.
 */
const rejection = (errors: GraphqlErrorItem[]): Rejection => {
  const detail = errors[0]?.extensions?.details;
  return {
    ...rejectionFrom(errors, errors[0]?.message ?? ''),
    ...(typeof detail === 'string' && detail.length > 0 ? { detail } : {}),
  };
};

/**
 * Save the draft (rules § saving the draft; contract § saving the draft): one
 * mutation per row, ALL IN PARALLEL — each its own server transaction, there
 * is no batch and no envelope — then the growth-rate write, only when every
 * row answered with a node. So a save with one bad row partly persists: the
 * accepted rows are saved, the bad row is not, the rates are not, and the
 * first rejection's reason is reported.
 *
 * `returnGraphqlErrors` because every rejection is untyped (see the .graphql
 * document). Reading them here keeps a domain rejection off the global modal
 * so the screen can show its inline notice and KEEP the draft dirty for
 * correction and retry (ui-surface S1 § save failed) — while the server's own
 * no-permission refusal still routes to the permission-denied modal, as any
 * Forbidden does (startup § permission denied).
 */
export const saveDemographics = async (
  inputs: SaveInputs
): Promise<SaveOutcome> => {
  // Every row at once — inserts and updates in ONE parallel batch, as the
  // reference client sends them (contract § saving the draft).
  const [inserts, updates] = await Promise.all([
    Promise.all(
      inputs.inserts.map(input =>
        graphqlFetch(
          InsertDemographicIndicator,
          { input },
          { returnGraphqlErrors: true }
        )
      )
    ),
    Promise.all(
      inputs.updates.map(input =>
        graphqlFetch(
          UpdateDemographicIndicator,
          { input },
          { returnGraphqlErrors: true }
        )
      )
    ),
  ]);
  const acceptedNewIds = inputs.inserts
    .filter((_, i) => inserts[i]?.kind === 'success')
    .map(input => input.id);

  const rowsOutcome = settle(
    [...inserts, ...updates].map(failure).filter(f => f !== undefined)
  );
  if (rowsOutcome) return { ...rowsOutcome, acceptedNewIds };

  const projection =
    inputs.projection.kind === 'insert'
      ? await graphqlFetch(
          InsertDemographicProjection,
          { input: inputs.projection.input },
          { returnGraphqlErrors: true }
        )
      : await graphqlFetch(
          UpdateDemographicProjection,
          { input: inputs.projection.input },
          { returnGraphqlErrors: true }
        );
  const projectionFailure = failure(projection);
  const projectionOutcome = settle(
    projectionFailure ? [projectionFailure] : []
  );
  if (projectionOutcome) return { ...projectionOutcome, acceptedNewIds };
  return { kind: 'saved' };
};

// Fold a batch's failures into one outcome. A Forbidden anywhere is the
// server's no-permission refusal and wins: it raises the permission-denied
// modal (the same modal the client's up-front mirror raises) and there is
// nothing else to say. Otherwise the first domain rejection is reported; a
// batch with only transport failures has already reported them globally.
const settle = (
  failures: Failure[]
):
  | { kind: 'rejected'; rejection: Rejection }
  | { kind: 'failed' }
  | undefined => {
  if (failures.length === 0) return undefined;
  const forbidden = failures.find(f => f.kind === 'forbidden');
  if (forbidden?.kind === 'forbidden') {
    reportPermissionDenied(missingPermissions(forbidden.errors));
    return { kind: 'failed' };
  }
  const rejected = failures.find(f => f.kind === 'rejected');
  if (rejected?.kind === 'rejected')
    return { kind: 'rejected', rejection: rejection(rejected.errors) };
  return { kind: 'failed' };
};
