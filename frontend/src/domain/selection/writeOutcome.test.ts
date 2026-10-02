import { describe, expect, it } from 'vitest';
import { setDictionaries, setLocale } from '@/intl/intl';
import commonEn from '@/intl/locales/en/common.json';
import {
  deleteEach,
  outcomeOf,
  refusalReason,
  type WriteOutcome,
} from './writeOutcome';

// The refusal copy is the behaviour, so a real dictionary is seeded (as
// api/rejection.test.ts does) — without it `server-error.*` falls back to the
// sentence-cased variant name and the assertions would prove nothing.
setDictionaries({ en: commonEn });
setLocale('en');

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
      'Equipment uses this catalogue item, so it cannot be deleted'
    );
  });
  it('maps a vanished record (item or reason) to not found', () => {
    expect(refusalReason([error('AssetCatalogueItemDoesNotExist')])).toBe(
      'This catalogue item no longer exists'
    );
    expect(refusalReason([error('ReasonDoesNotExist')])).toBe(
      'This log reason no longer exists'
    );
  });
  it('names a reason id already taken (the reason create)', () => {
    expect(refusalReason([error('AssetLogReasonAlreadyExists')])).toBe(
      'This log reason already exists'
    );
  });
});

describe('OMS-REG-CAT-09.15 / OMS-REG-CAT-03.33 — a write off the central server is refused as not central', () => {
  it('maps the wrapper refusal', () => {
    expect(
      refusalReason([error('Not a central server', 'Internal error')])
    ).toBe('Operation is only permitted on central server');
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
        ? { kind: 'refused', reason: 'in use' }
        : { kind: 'done' }
    );
    expect(summary.deleted).toEqual(['a', 'b']);
    expect(summary.refused).toEqual([{ record: 'in-use', reason: 'in use' }]);
    expect(summary.failed).toBe(false);
  });
});

// The batch size of a bulk delete. The asset catalogue sends ten at a time;
// Manage › Plugins sends one, because the server addresses a plugin row by id
// alone and a backend and a frontend row can share one
// (spec/plugin-management/rules.md › uninstalling plugins).

const tracked = () => {
  let inFlight = 0;
  let most = 0;
  const deleteOne = async (): Promise<WriteOutcome> => {
    inFlight += 1;
    most = Math.max(most, inFlight);
    await new Promise(resolve => setTimeout(resolve, 1));
    inFlight -= 1;
    return { kind: 'done' };
  };
  return { deleteOne, most: () => most };
};

describe('deleteEach — how many deletes are in flight at once', () => {
  it('a batch of one never runs two calls together', async () => {
    const calls = tracked();
    await deleteEach(['shared', 'shared', 'other'], calls.deleteOne, 1);
    expect(calls.most()).toBe(1);
  });

  it('by default runs a batch together', async () => {
    const calls = tracked();
    await deleteEach(['a', 'b', 'c'], calls.deleteOne);
    expect(calls.most()).toBe(3);
  });

  it('reports a refusal beside the records it did delete, in order', async () => {
    const summary = await deleteEach(
      ['a', 'gone', 'b'],
      async record =>
        record === 'gone'
          ? { kind: 'refused', reason: 'Plugin not found' }
          : { kind: 'done' },
      1
    );
    expect(summary.deleted).toEqual(['a', 'b']);
    expect(summary.refused).toEqual([
      { record: 'gone', reason: 'Plugin not found' },
    ]);
  });
});
