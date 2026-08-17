import { describe, expect, it } from 'vitest';
import type { GraphqlResult } from '../api/graphql';
import type { InitialiseSiteResult } from '../api/initialisation.generated';
import {
  INITIALISE_RETRY_ATTEMPTS,
  INITIALISE_RETRY_INTERVAL_MS,
} from '../config';
import { initialiseStep } from './initialiseRetry';

/*
 * The initialisation screen's silent wait for the central server
 * (spec/startup rules § Initialisation, D99; `OMS-REG-LGN-03.18`–`.21`, and
 * the pre-start paths `.11`/`.17` it must not disturb).
 *
 * The load-bearing cases are the two boundaries. ONLY the one transient kind
 * may be waited on — every other kind is a real error the user must see now,
 * not in a minute. And the retry budget must terminate: a wait that never
 * gives up leaves the form permanently locked behind "Initialising…" with no
 * escape but a reload, which is exactly what discards the URL, site name and
 * password just typed.
 */

const started: GraphqlResult<InitialiseSiteResult> = {
  kind: 'success',
  data: {
    initialiseSite: { __typename: 'SyncSettingsNode', username: 'site' },
  },
};

const waiting: GraphqlResult<InitialiseSiteResult> = {
  kind: 'success',
  data: {
    initialiseSite: {
      __typename: 'SyncErrorV7Node',
      variantV7: 'WAITING_FOR_CENTRAL_V7_UPGRADE',
      fullError: 'Waiting for next sync on central to update site to v7',
    },
  },
};

const waitingError = {
  variant: 'WAITING_FOR_CENTRAL_V7_UPGRADE',
  fullError: 'Waiting for next sync on central to update site to v7',
} as const;

describe('initialiseStep (OMS-REG-LGN-03.18-.21)', () => {
  it('starts initialisation on a success, first attempt or mid-wait (.20)', () => {
    expect(initialiseStep(started, 0)).toEqual({ kind: 'started' });
    expect(initialiseStep(started, 7, waitingError)).toEqual({
      kind: 'started',
    });
  });

  it('waits out the transient error while retries remain (.18)', () => {
    expect(initialiseStep(waiting, 0)).toEqual({
      kind: 'retry',
      error: waitingError,
    });
    expect(
      initialiseStep(waiting, INITIALISE_RETRY_ATTEMPTS - 1, waitingError)
    ).toEqual({ kind: 'retry', error: waitingError });
  });

  it('shows the transient error once the retries run out (.21)', () => {
    expect(
      initialiseStep(waiting, INITIALISE_RETRY_ATTEMPTS, waitingError)
    ).toEqual({ kind: 'failed', error: waitingError });
  });

  it('never waits on any other error kind (.11, .21)', () => {
    // The near neighbours it would be tempting to lump in — same upgrade
    // saga, different meaning — plus a legacy-union error.
    const v7Variants = [
      'SITE_IS_NOT_V7',
      'INVALID_SITE_NAME_OR_PASSWORD',
      'CONNECTION_ERROR',
      'OTHER',
    ] as const;
    for (const variantV7 of v7Variants) {
      const result: GraphqlResult<InitialiseSiteResult> = {
        kind: 'success',
        data: {
          initialiseSite: {
            __typename: 'SyncErrorV7Node',
            variantV7,
            fullError: 'boom',
          },
        },
      };
      expect(initialiseStep(result, 0)).toEqual({
        kind: 'failed',
        error: { variant: variantV7, fullError: 'boom' },
      });
    }
    const legacy: GraphqlResult<InitialiseSiteResult> = {
      kind: 'success',
      data: {
        initialiseSite: {
          __typename: 'SyncErrorNode',
          variant: 'V7_UPGRADE_FAILED',
          fullError: 'boom',
        },
      },
    };
    expect(initialiseStep(legacy, 0)).toEqual({
      kind: 'failed',
      error: { variant: 'V7_UPGRADE_FAILED', fullError: 'boom' },
    });
  });

  it("releases the form with no error of its own when the user's own submit fails globally (.17)", () => {
    const failures: GraphqlResult<InitialiseSiteResult>[] = [
      { kind: 'unauthenticated' },
      { kind: 'forbidden' },
      { kind: 'unexpectedError' },
      { kind: 'graphqlError', message: 'boom', errors: [] },
    ];
    for (const failure of failures) {
      expect(initialiseStep(failure, 0)).toEqual({ kind: 'released' });
    }
  });

  it('surfaces the retained transient error when a silent retry itself fails (.21)', () => {
    // Retries opt out of the global modal (contract § Initialisation), so a
    // failed retry must end the wait on the last real, structured reason —
    // never a silently unlocked form with nothing shown.
    expect(
      initialiseStep({ kind: 'unexpectedError' }, 5, waitingError)
    ).toEqual({ kind: 'failed', error: waitingError });
  });

  it('always terminates: exactly the budgeted number of retry steps', () => {
    let retries = 0;
    for (let attempt = 0; attempt < 30; attempt++) {
      const step = initialiseStep(waiting, retries, waitingError);
      if (step.kind !== 'retry') {
        expect(step).toEqual({ kind: 'failed', error: waitingError });
        break;
      }
      retries++;
    }
    expect(retries).toBe(INITIALISE_RETRY_ATTEMPTS);
  });

  it('holds the ~1 minute window the issue asked for (#504)', () => {
    // Pins the constants against a well-meaning edit: 12 retries, 5 s apart.
    expect(INITIALISE_RETRY_ATTEMPTS).toBe(12);
    expect(INITIALISE_RETRY_INTERVAL_MS).toBe(5000);
    expect(INITIALISE_RETRY_ATTEMPTS * INITIALISE_RETRY_INTERVAL_MS).toBe(
      60_000
    );
  });
});
