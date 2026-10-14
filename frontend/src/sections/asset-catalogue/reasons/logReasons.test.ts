import { describe, expect, it } from 'vitest';
import {
  STATUSES,
  emptyDraft,
  isReasonMissing,
  orderReasons,
  statusOptions,
  toReasonInput,
  type AssetLogStatus,
  type LogReasonRow,
} from './logReasons';

// Anchors: spec/asset-catalogue/cases/OMS-REG-CAT-03 — the log reasons.

describe('OMS-REG-CAT-03.17 — a new reason starts at Functioning, comments not required', () => {
  it('the empty draft', () => {
    expect(emptyDraft()).toEqual({
      reason: '',
      status: 'FUNCTIONING',
      commentsRequired: false,
    });
  });
});

describe('OMS-REG-CAT-03.18 — a blank or spaces-only reason is missing', () => {
  it.each(['', '   '])('"%s" is missing', reason => {
    expect(isReasonMissing({ ...emptyDraft(), reason })).toBe(true);
  });
  it('any text is not', () => {
    expect(isReasonMissing({ ...emptyDraft(), reason: ' x ' })).toBe(false);
  });
});

describe('OMS-REG-CAT-03.2–.9 / .19 — a reason for each of the six statuses', () => {
  it("offers the six statuses in the server's order", () => {
    expect(statusOptions().map(o => o.value)).toEqual([
      'DECOMMISSIONED',
      'FUNCTIONING',
      'FUNCTIONING_BUT_NEEDS_ATTENTION',
      'NOT_FUNCTIONING',
      'NOT_IN_USE',
      'UNSERVICEABLE',
    ]);
  });
  it.each(STATUSES)(
    'creates a %s reason with the text as typed and the flag',
    status => {
      expect(
        toReasonInput(
          { reason: ' Worn out ', status, commentsRequired: true },
          'id-1'
        )
      ).toEqual({
        id: 'id-1',
        assetLogStatus: status,
        reason: ' Worn out ',
        commentsRequired: true,
      });
    }
  );
});

describe('OMS-REG-CAT-03.20 — nothing checks a duplicate reason text', () => {
  const draft = {
    reason: 'Stored',
    status: 'NOT_IN_USE' as const,
    commentsRequired: false,
  };
  it("the editor's one check is a missing text, so a text already listed under that status passes it", () => {
    expect(isReasonMissing(draft)).toBe(false);
  });
  it('each create is its own insert under its own id — nothing merges two of one text', () => {
    expect(toReasonInput(draft, 'a')).toEqual({
      id: 'a',
      assetLogStatus: 'NOT_IN_USE',
      reason: 'Stored',
      commentsRequired: false,
    });
    expect(toReasonInput(draft, 'b').id).toBe('b');
  });
});

describe('OMS-REG-CAT-03.15 / .16 / .34 — the list orders by the status name shown', () => {
  // The names as the en and fr catalogs carry them. Passed in, so the order
  // is checked against the names the reader sees, not the enum.
  const ENGLISH: Record<AssetLogStatus, string> = {
    DECOMMISSIONED: 'Decommissioned',
    FUNCTIONING: 'Functioning',
    FUNCTIONING_BUT_NEEDS_ATTENTION: 'Functioning but needs attention',
    NOT_FUNCTIONING: 'Not Functioning',
    NOT_IN_USE: 'Not in use',
    UNSERVICEABLE: 'Unserviceable',
  };
  const FRENCH: Record<AssetLogStatus, string> = {
    DECOMMISSIONED: 'Au rebut',
    FUNCTIONING: 'Fonctionnel',
    FUNCTIONING_BUT_NEEDS_ATTENTION: 'Fonctionnel mais nécessite réparation',
    NOT_FUNCTIONING: 'En panne',
    NOT_IN_USE: 'Non-utilisé',
    UNSERVICEABLE: 'Irréparable',
  };
  // In the server's id order, which is the enum's own order here.
  const rows: LogReasonRow[] = STATUSES.map((status, i) => ({
    __typename: 'AssetLogReasonNode',
    id: `r${i}`,
    assetLogStatus: status,
    reason: `reason ${i}`,
    commentsRequired: false,
  }));
  const names = (
    names: Record<AssetLogStatus, string>,
    locale: string,
    desc?: boolean
  ) =>
    orderReasons(
      rows,
      desc === undefined ? undefined : { key: 'status', desc },
      status => names[status],
      locale
    ).map(row => names[row.assetLogStatus]);

  it('.15 English ascending reads A to Z', () => {
    expect(names(ENGLISH, 'en', false)).toEqual([
      'Decommissioned',
      'Functioning',
      'Functioning but needs attention',
      'Not Functioning',
      'Not in use',
      'Unserviceable',
    ]);
  });
  it('.16 reversing reverses it', () => {
    expect(names(ENGLISH, 'en', true)).toEqual(
      names(ENGLISH, 'en', false).reverse()
    );
  });
  it('.34 French reads in the French names’ order, not the enum’s', () => {
    expect(names(FRENCH, 'fr', false)).toEqual([
      'Au rebut',
      'En panne',
      'Fonctionnel',
      'Fonctionnel mais nécessite réparation',
      'Irréparable',
      'Non-utilisé',
    ]);
    expect(names(FRENCH, 'fr', true)).toEqual(
      names(FRENCH, 'fr', false).reverse()
    );
  });
  it('within one status the server’s order stands', () => {
    const twoStored = [
      { ...rows[4]!, id: 'b', reason: 'Stored' },
      { ...rows[4]!, id: 'a', reason: 'Awaiting installation' },
    ];
    expect(
      orderReasons(twoStored, { key: 'status', desc: false }, s => s, 'en').map(
        r => r.id
      )
    ).toEqual(['b', 'a']);
  });
  it('with no sort the rows keep the server’s order', () => {
    expect(names(FRENCH, 'fr')).toEqual(
      rows.map(r => FRENCH[r.assetLogStatus])
    );
  });
});
