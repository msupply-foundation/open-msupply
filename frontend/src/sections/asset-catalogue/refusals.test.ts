import { describe, expect, it } from 'vitest';
import { deleteEach, outcomeOf, refusalReason } from './refusals';

// Anchors: spec/asset-catalogue/cases — OMS-REG-CAT-09.15 / 03.33 (the
// off-central refusal), OMS-REG-CAT-09.4–.6 (the in-use guard and a mixed bulk
// delete), OMS-REG-CAT-03.12 (a reason delete). The item delete and the reason writes refuse ONLY with top-level
// errors (contract § deleting catalogue items), which is what is read here.

const error = (details: string, message = 'Bad user input') => ({
  message,
  extensions: { details },
});

describe('OMS-REG-CAT-09.4 — an in-use item is refused with its reason', () => {
  it('maps AssetCatalogueItemInUse to the in-use message', () => {
    expect(refusalReason([error('AssetCatalogueItemInUse')])).toBe(
      'error.asset-catalogue-item-in-use'
    );
  });
  it('maps a vanished record (item or reason) to not found', () => {
    expect(refusalReason([error('AssetCatalogueItemDoesNotExist')])).toBe(
      'messages.record-not-found'
    );
    expect(refusalReason([error('ReasonDoesNotExist')])).toBe(
      'messages.record-not-found'
    );
  });
});

describe('OMS-REG-CAT-09.15 / OMS-REG-CAT-03.33 — a write off the central server is refused as not central', () => {
  it('maps the wrapper refusal', () => {
    expect(
      refusalReason([error('Not a central server', 'Internal error')])
    ).toBe('auth.not-a-central-server');
  });
});

describe('outcomes', () => {
  it('a Forbidden is kept apart for the permission-denied modal', () => {
    const outcome = outcomeOf({
      kind: 'graphqlError',
      message: 'Forbidden',
      errors: [
        {
          message: 'Forbidden',
          extensions: {
            details:
              'Missing permission: AssetMutate, Required permissions: HasPermission(AssetMutate)',
          },
        },
      ],
    });
    expect(outcome.kind).toBe('forbidden');
  });
  it('success is done', () => {
    expect(outcomeOf({ kind: 'success', data: {} })).toEqual({ kind: 'done' });
  });
});

describe('OMS-REG-CAT-09.5 / .6 / OMS-REG-CAT-03.12 — each selected record is deleted on its own', () => {
  it('a refusal of one leaves the others deleted, and both sides are reported', async () => {
    const summary = await deleteEach(['a', 'in-use', 'b'], async record =>
      record === 'in-use'
        ? { kind: 'refused', reason: 'error.asset-catalogue-item-in-use' }
        : { kind: 'done' }
    );
    expect(summary.deleted).toEqual(['a', 'b']);
    expect(summary.refused).toEqual([
      { record: 'in-use', reason: 'error.asset-catalogue-item-in-use' },
    ]);
    expect(summary.failed).toBe(false);
  });
});
