// The initialisation screen's silent wait for the central server
// (spec/startup/rules.md § Initialisation, D97, issue #504;
// OMS-REG-LGN-03.18–.21). Pure — no framework, no I/O — so the two rules that
// would otherwise silently regress (ONLY the one transient variant is waited
// on; the retry budget terminates) are unit-testable.

import type { GraphqlResult } from '../api/graphql';
import type { InitialiseSiteResult } from '../api/initialisation.generated';
import type {
  SyncError,
  SyncErrorVariant,
} from '../sections/sync-modal/syncStatus';
import { INITIALISE_RETRY_ATTEMPTS } from '../config';

// The ONE transient kind (spec/startup/contract.md § Initialisation): the
// central server has asked the legacy central server to move this site to the
// current sync protocol and is waiting for its own sync to deliver the result.
// Every other kind is a real error the user must see now, not in a minute.
// Typed against the generated union so a schema rename is a compile error
// here, not a silent never-retries (kdd/type-safety).
const TRANSIENT_VARIANT: SyncErrorVariant = 'WAITING_FOR_CENTRAL_V7_UPGRADE';

/** What the page does with the answer to one initialise attempt. */
export type InitialiseStep =
  // Initialisation has started — watch progress (OMS-REG-LGN-03.20).
  | { kind: 'started' }
  // Transient and budget remains — hold the lock, show the waiting notice,
  // try again after the interval (OMS-REG-LGN-03.18).
  | { kind: 'retry'; error: SyncError }
  // Show this error, unlock the form (OMS-REG-LGN-03.11/.21).
  | { kind: 'failed'; error: SyncError }
  // Globally-handled failure on the user's own submit: the modal owns the
  // description, the form unlocks with no error of its own
  // (OMS-REG-LGN-03.17).
  | { kind: 'released' };

/**
 * Classify one `initialiseSite` answer.
 *
 * @param retriesUsed silent retries already made — 0 on the user's own submit
 * @param waitingError the transient error a retry is waiting on (set once the
 *   first `retry` step is taken); surfaced if a background retry itself fails,
 *   so the wait never ends on a silently unlocked form with nothing shown
 */
export const initialiseStep = (
  result: GraphqlResult<InitialiseSiteResult>,
  retriesUsed: number,
  waitingError?: SyncError
): InitialiseStep => {
  if (result.kind !== 'success') {
    // A silent retry opts out of the global modal (contract § Initialisation),
    // so its failure must surface the last real, structured reason instead.
    return waitingError !== undefined && retriesUsed > 0
      ? { kind: 'failed', error: waitingError }
      : { kind: 'released' };
  }
  const { initialiseSite } = result.data;
  if (initialiseSite.__typename === 'SyncSettingsNode') {
    return { kind: 'started' };
  }
  const error: SyncError = {
    variant:
      initialiseSite.__typename === 'SyncErrorV7Node'
        ? initialiseSite.variantV7
        : initialiseSite.variant,
    fullError: initialiseSite.fullError,
  };
  if (
    error.variant === TRANSIENT_VARIANT &&
    retriesUsed < INITIALISE_RETRY_ATTEMPTS
  ) {
    return { kind: 'retry', error };
  }
  return { kind: 'failed', error };
};
