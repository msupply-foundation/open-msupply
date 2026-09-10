import { describe, expect, it } from 'vitest';
import { ASSET_STATUSES } from '../equipment';
import {
  buildMappingLogInput,
  buildStatusLogInput,
  canSubmitStatus,
  commentRequired,
  emptyStatusForm,
  isMapping,
  isMappingDateValid,
  logKindFilter,
  reasonsForStatus,
  withStatus,
  type LogReason,
  type StatusFormState,
} from './statusLog';

const reason = (over: Partial<LogReason>): LogReason =>
  ({
    id: 'reason-1',
    assetLogStatus: 'NOT_FUNCTIONING',
    reason: 'Lack of power',
    commentsRequired: false,
    ...over,
  }) as LogReason;

const REASONS: LogReason[] = [
  reason({ id: 'nf-1' }),
  reason({ id: 'nf-2', reason: 'Needs spare parts' }),
  reason({
    id: 'attn-1',
    assetLogStatus: 'FUNCTIONING_BUT_NEEDS_ATTENTION',
    reason: 'Needs servicing',
  }),
  reason({
    id: 'nu-1',
    assetLogStatus: 'NOT_IN_USE',
    reason: 'Stored',
    commentsRequired: true,
  }),
];

const form = (over: Partial<StatusFormState> = {}): StatusFormState => ({
  ...emptyStatusForm(),
  ...over,
});

describe('OMS-REG-CCE-06.19 — a status is required', () => {
  it('refuses an entry with no status chosen', () => {
    expect(canSubmitStatus(form(), REASONS)).toBe(false);
  });

  it('accepts one once a status is chosen', () => {
    expect(canSubmitStatus(form({ status: 'FUNCTIONING' }), REASONS)).toBe(
      true
    );
  });
});

describe('OMS-REG-CCE-06.20 — the reasons offered belong to the chosen status', () => {
  it('offers only that status’s reasons', () => {
    expect(
      reasonsForStatus(REASONS, 'NOT_FUNCTIONING').map(r => r.id)
    ).toEqual(['nf-1', 'nf-2']);
  });

  it('offers none for a status with none configured', () => {
    expect(reasonsForStatus(REASONS, 'DECOMMISSIONED')).toEqual([]);
  });

  it('offers none while no status is chosen', () => {
    expect(reasonsForStatus(REASONS, '')).toEqual([]);
  });
});

describe('OMS-REG-CCE-06.21 — changing the status clears the reason', () => {
  it('drops a reason chosen under the previous status', () => {
    const chosen = form({ status: 'NOT_FUNCTIONING', reasonId: 'nf-1' });
    expect(withStatus(chosen, 'FUNCTIONING').reasonId).toBe('');
  });

  it('keeps the rest of the draft', () => {
    const chosen = form({ status: 'NOT_FUNCTIONING', comment: 'a note' });
    expect(withStatus(chosen, 'FUNCTIONING').comment).toBe('a note');
  });
});

describe('OMS-REG-CCE-06.22 — Not Functioning always carries a reason', () => {
  it('refuses it with no reason', () => {
    expect(canSubmitStatus(form({ status: 'NOT_FUNCTIONING' }), REASONS)).toBe(
      false
    );
  });

  it('accepts it once a reason is chosen', () => {
    expect(
      canSubmitStatus(
        form({ status: 'NOT_FUNCTIONING', reasonId: 'nf-1' }),
        REASONS
      )
    ).toBe(true);
  });

  it('does not demand one of any other status', () => {
    expect(canSubmitStatus(form({ status: 'NOT_IN_USE' }), REASONS)).toBe(true);
  });
});

describe('OMS-REG-CCE-06.24 — a reason may demand observations', () => {
  const chosen = form({ status: 'NOT_IN_USE', reasonId: 'nu-1' });

  it('reports the requirement so the field can mark itself', () => {
    expect(commentRequired(chosen, REASONS)).toBe(true);
    expect(commentRequired(form({ reasonId: 'nf-1' }), REASONS)).toBe(false);
  });

  it('refuses the entry with a blank note', () => {
    expect(canSubmitStatus(chosen, REASONS)).toBe(false);
  });

  it('refuses one whose note is only whitespace', () => {
    expect(canSubmitStatus({ ...chosen, comment: '   ' }, REASONS)).toBe(false);
  });

  it('accepts it once the note carries something', () => {
    expect(canSubmitStatus({ ...chosen, comment: 'in the store room' }, REASONS)).toBe(
      true
    );
  });
});

describe('OMS-REG-CCE-06.18 — the status entry input', () => {
  it('carries the status, the reason and the note', () => {
    const input = buildStatusLogInput(
      form({ status: 'NOT_FUNCTIONING', reasonId: 'nf-1', comment: ' cold ' }),
      'asset-1',
      'log-1'
    );
    expect(input).toMatchObject({
      id: 'log-1',
      assetId: 'asset-1',
      status: 'NOT_FUNCTIONING',
      reasonId: 'nf-1',
      comment: 'cold',
    });
  });

  it('sends null rather than an empty string for an unset reason or note', () => {
    const input = buildStatusLogInput(
      form({ status: 'FUNCTIONING' }),
      'asset-1',
      'log-1'
    );
    expect(input.reasonId).toBeNull();
    expect(input.comment).toBeNull();
  });

  it('omits the type — absent, the server records a status update', () => {
    const input = buildStatusLogInput(
      form({ status: 'FUNCTIONING' }),
      'asset-1',
      'log-1'
    );
    expect(input).not.toHaveProperty('type');
  });

  it('omits the datetime — an entry recorded here is dated now', () => {
    const input = buildStatusLogInput(
      form({ status: 'FUNCTIONING' }),
      'asset-1',
      'log-1'
    );
    expect(input).not.toHaveProperty('logDatetime');
  });
});

describe('OMS-REG-CCE-06.33 — the temperature mapping input', () => {
  it('names the mapping type explicitly — absent it the entry is refused', () => {
    const input = buildMappingLogInput('2026-09-08', 'all good', 'a', 'l');
    expect(input.type).toBe('TEMPERATURE_MAPPING');
  });

  it('carries no status and no reason', () => {
    const input = buildMappingLogInput('2026-09-08', '', 'a', 'l');
    expect(input.status).toBeUndefined();
    expect(input.reasonId).toBeUndefined();
  });

  it('sends the picked day as its own UTC day, whatever the user’s zone', () => {
    // The server derives the mapping-date property by formatting the stored
    // UTC datetime — so the instant must land on the picked UTC day, or the
    // property reads a day early for every user east of UTC.
    const input = buildMappingLogInput(
      '2023-05-06',
      '',
      'a',
      'l',
      new Date('2026-09-08T00:00:00Z')
    );
    expect(input.logDatetime).toBe('2023-05-06T00:00:00.000Z');
  });

  it('clamps to now rather than sending an instant the server would refuse', () => {
    // Between local midnight and 00:00Z on the same day, the picked day's UTC
    // start is still in the future (OMS-REG-CCE-06.25).
    const now = new Date('2026-09-07T13:00:00Z');
    const input = buildMappingLogInput('2026-09-08', '', 'a', 'l', now);
    expect(input.logDatetime).toBe(now.toISOString());
  });
});

describe('OMS-REG-CCE-06.25 / .26 — a mapping may be backdated, never postdated', () => {
  // Local noon, so the assertions read the same calendar day in every zone the
  // suite might run in — the comparison is over days, not instants.
  const now = new Date(2026, 8, 8, 12, 0, 0);

  it('accepts today', () => {
    expect(isMappingDateValid('2026-09-08', now)).toBe(true);
  });

  it('accepts an earlier day', () => {
    expect(isMappingDateValid('2023-05-06', now)).toBe(true);
  });

  it('refuses a later day', () => {
    expect(isMappingDateValid('2026-09-09', now)).toBe(false);
  });

  it('accepts today even at the very start of the local day', () => {
    // An instant comparison would call today future for any user east of UTC.
    expect(isMappingDateValid('2026-09-08', new Date(2026, 8, 8, 0, 0, 1))).toBe(
      true
    );
  });

  it('refuses a blank or unreadable date', () => {
    expect(isMappingDateValid('', now)).toBe(false);
    expect(isMappingDateValid('not-a-date', now)).toBe(false);
  });
});

describe('OMS-REG-CCE-06.38 — the history’s kind filter', () => {
  it('narrows to status entries by enumerating all six statuses', () => {
    // There is no "has a status" predicate, and `type: STATUS_UPDATE` would
    // also match the historical rows carrying no type (contract › temperature
    // mapping).
    const filter = logKindFilter('status', ASSET_STATUSES);
    expect(filter.status?.equalAny).toHaveLength(6);
    expect(filter.type).toBeUndefined();
  });

  it('narrows to mappings by type', () => {
    const filter = logKindFilter('mapping', ASSET_STATUSES);
    expect(filter.type).toEqual({ equalTo: 'TEMPERATURE_MAPPING' });
    expect(filter.status).toBeUndefined();
  });

  it('narrows to nothing when no kind is chosen', () => {
    expect(logKindFilter('all', ASSET_STATUSES)).toEqual({});
  });
});

describe('OMS-REG-CCE-06.40 — a mapping never displaces the functional status', () => {
  it('tells the two kinds apart', () => {
    expect(isMapping({ type: 'TEMPERATURE_MAPPING' })).toBe(true);
    expect(isMapping({ type: 'STATUS_UPDATE' })).toBe(false);
  });
});
