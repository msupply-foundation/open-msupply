import { describe, expect, it } from 'vitest';
import {
  deleteOutcome,
  summariseOutcomes,
  type DeleteOutcome,
} from './deleteLocations';
import type { GraphqlResult } from '@/api/graphql';
import type { DeleteLocationResult } from './locations.generated';

// AC-citing tests for the delete flow's logic (spec/locations/acceptance.md
// § deletion). The dialog half — the confirmation gate (OMS-REG-INV-01.34) and
// the in-use report rendering — lives in DeleteLocationsAction; the mutation is
// only fired from the confirm phase's OK, and these tests pin how each call's
// result becomes an outcome and how outcomes fold into the report.

const success = (
  deleteLocation: DeleteLocationResult['deleteLocation']
): GraphqlResult<DeleteLocationResult> => ({
  kind: 'success',
  data: { deleteLocation },
});

const deleted = success({ __typename: 'DeleteResponse', id: 'loc-1' });

const inUse = success({
  __typename: 'DeleteLocationError',
  error: {
    __typename: 'LocationInUse',
    description: 'Location in use',
    stockLines: { __typename: 'StockLineConnector', totalCount: 3 },
    invoiceLines: { totalCount: 2 },
  },
});

/** The same typed refusal, from a reference the guard cannot name (a sensor,
 *  movement history): blocked, with nothing to list. */
const inUseUnnamed = success({
  __typename: 'DeleteLocationError',
  error: {
    __typename: 'LocationInUse',
    description: 'Location in use',
    stockLines: { __typename: 'StockLineConnector', totalCount: 0 },
    invoiceLines: { totalCount: 0 },
  },
});

describe('OMS-REG-INV-01.21 — delete unused location', () => {
  it('a DeleteResponse means the location was removed', () => {
    expect(deleteOutcome('loc-1', deleted)).toEqual({
      kind: 'deleted',
      id: 'loc-1',
    });
  });
});

describe('OMS-REG-INV-01.32 — in-use location is not deleted', () => {
  it('LocationInUse becomes the in-use report row, carrying the referencing stock and invoice lines', () => {
    expect(deleteOutcome('loc-2', inUse)).toEqual({
      kind: 'inUse',
      id: 'loc-2',
      stockLines: 3,
      invoiceLines: 2,
    });
  });
});

describe('OMS-REG-INV-01.33 — bulk delete is per-location', () => {
  it('folds mixed outcomes: unused deleted, in-use reported, without blocking each other', () => {
    const outcomes: DeleteOutcome[] = [
      deleteOutcome('a', deleted),
      deleteOutcome('b', inUse),
      deleteOutcome('c', deleted),
    ];
    const summary = summariseOutcomes(outcomes);
    expect(summary.deletedCount).toBe(2);
    expect(summary.inUse).toEqual([
      { kind: 'inUse', id: 'b', stockLines: 3, invoiceLines: 2 },
    ]);
    expect(summary.failedCount).toBe(0);
  });

  it('deletion is not all-or-nothing: a fully-blocked selection still reports every member individually', () => {
    const summary = summariseOutcomes([
      deleteOutcome('a', inUse),
      deleteOutcome('b', inUse),
    ]);
    expect(summary.deletedCount).toBe(0);
    expect(summary.inUse).toHaveLength(2);
  });
});

describe('OMS-REG-INV-01.35 — emptied location with movement history is not deletable', () => {
  // What blocks it is not a reference the server's guard enumerates: movement
  // history (like a cold-chain sensor) is caught at the database constraint
  // and mapped to the SAME LocationInUse, with both connectors empty
  // (contract.md ⚠️ the two deletion wire traps). So the refusal is an in-use
  // row that can name nothing — zero counts here mean "blocked by something
  // unnameable", never "blocked by nothing".
  it('LocationInUse with no references is still an in-use outcome', () => {
    expect(deleteOutcome('loc-3', inUseUnnamed)).toEqual({
      kind: 'inUse',
      id: 'loc-3',
      stockLines: 0,
      invoiceLines: 0,
    });
  });

  it('it is reported, not counted as a plain failure', () => {
    const summary = summariseOutcomes([
      deleteOutcome('a', deleted),
      deleteOutcome('b', inUseUnnamed),
    ]);
    expect(summary.deletedCount).toBe(1);
    expect(summary.failedCount).toBe(0);
    expect(summary.inUse).toEqual([
      { kind: 'inUse', id: 'b', stockLines: 0, invoiceLines: 0 },
    ]);
  });
});

describe('an untyped failure is not the in-use report', () => {
  // Wrong-store and not-found are declared on the union but unreachable: they
  // arrive as plain GraphQL errors (contract.md ⚠️ wire trap), and degrade to
  // a counted failure line rather than a report row.
  it('an untyped GraphQL error maps to a failed outcome', () => {
    const outcome = deleteOutcome('loc-4', {
      kind: 'graphqlError',
      message: 'Bad user input',
      errors: [
        {
          message: 'Bad user input',
          extensions: { details: 'LocationDoesNotBelongToCurrentStore' },
        },
      ],
    });
    expect(outcome).toEqual({ kind: 'failed', id: 'loc-4' });
  });

  it('failed outcomes are counted in the summary, separate from the in-use report', () => {
    const summary = summariseOutcomes([
      deleteOutcome('a', deleted),
      deleteOutcome('b', {
        kind: 'graphqlError',
        message: 'Bad user input',
        errors: [],
      }),
    ]);
    expect(summary.deletedCount).toBe(1);
    expect(summary.failedCount).toBe(1);
    expect(summary.inUse).toHaveLength(0);
  });
});

describe('OMS-REG-INV-01.34 — delete requires confirmation (logic half)', () => {
  // The gate itself is the dialog's: DeleteLocationsAction only calls the
  // mutation from its confirm phase's OK (re-entry guarded). What the logic
  // layer can pin: an empty outcome set — nothing confirmed, nothing run —
  // reports nothing deleted.
  it('no outcomes → nothing deleted, nothing reported', () => {
    expect(summariseOutcomes([])).toEqual({
      deletedCount: 0,
      inUse: [],
      failedCount: 0,
    });
  });
});
