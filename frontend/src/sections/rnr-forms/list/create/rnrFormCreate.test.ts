import { describe, expect, it } from 'vitest';
import {
  defaultProgramId,
  defaultScheduleId,
  defaultSupplierId,
  periodSelection,
  programOptions,
} from './rnrFormCreate';
import type {
  ProgramListItem,
  ScheduleWithPeriods,
} from '@/domain/program/programResource';
import type { RnrFormRowFragment } from '../rnrForms.generated';

// The create modal's selection logic (spec/rnr-forms/rules.md § creation;
// ui-surface S2). Behaviours cited from OMS-REG-REPL-07: .5/.6 (program
// auto-select vs no pre-selection), .7/.8 (schedule), .9 (closed periods
// only — server-supplied; the picker gates what it is given), .10 (no supplier
// without history), .36–.38 (prefill from the most recent form), .39 (next
// period pre-selected), .40 (periods at/before the last-used not selectable),
// .41 (draft previous form blocks), .42 (no periods left).

const program = (id: string, isImmunisation = false): ProgramListItem => ({
  id,
  name: id,
  elmisCode: null,
  isImmunisation,
});

// Newest-first, matching the server's order (contract § creation rules).
const monthly: ScheduleWithPeriods = {
  id: 'monthly',
  name: 'Monthly',
  periods: [
    {
      id: 'dec',
      inUse: false,
      period: {
        id: 'dec',
        name: 'Dec 2024',
        startDate: '2024-12-01',
        endDate: '2024-12-31',
      },
    },
    {
      id: 'nov',
      inUse: false,
      period: {
        id: 'nov',
        name: 'Nov 2024',
        startDate: '2024-11-01',
        endDate: '2024-11-30',
      },
    },
    {
      id: 'oct',
      inUse: false,
      period: {
        id: 'oct',
        name: 'Oct 2024',
        startDate: '2024-10-01',
        endDate: '2024-10-31',
      },
    },
  ],
};

const form = (
  periodId: 'dec' | 'nov' | 'oct',
  status: RnrFormRowFragment['status'] = 'FINALISED'
): RnrFormRowFragment => {
  const period = monthly.periods.find(p => p.id === periodId)!.period;
  return {
    id: `form-${periodId}`,
    createdDatetime: '2026-08-18T00:00:00Z',
    status,
    programId: 'program-test',
    programName: 'Program Test',
    supplierId: 'supplier-1',
    supplierName: 'Ravenclaw Clinic',
    period,
  };
};

describe('programOptions (ui-surface S2 — non-immunisation programs)', () => {
  it('excludes immunisation programs', () => {
    expect(
      programOptions([program('a'), program('imm', true)]).map(p => p.id)
    ).toEqual(['a']);
  });
});

describe('defaultProgramId (OMS-REG-REPL-07.5 .6 .36)', () => {
  it('auto-selects a sole program (.5)', () => {
    expect(defaultProgramId([program('only')], undefined)).toBe('only');
  });

  it('pre-selects nothing with several programs and no history (.6)', () => {
    expect(
      defaultProgramId([program('a'), program('b')], undefined)
    ).toBeUndefined();
  });

  it('pre-fills the most recent form’s program (.36)', () => {
    expect(
      defaultProgramId([program('a'), program('program-test')], form('nov'))
    ).toBe('program-test');
  });
});

describe('defaultScheduleId (OMS-REG-REPL-07.7 .8 .37)', () => {
  it('auto-selects a sole schedule (.7)', () => {
    expect(defaultScheduleId([monthly], undefined)).toBe('monthly');
  });

  it('pre-selects nothing with several schedules and no history (.8)', () => {
    const weekly: ScheduleWithPeriods = {
      id: 'weekly',
      name: 'Weekly',
      periods: [],
    };
    expect(defaultScheduleId([monthly, weekly], undefined)).toBeUndefined();
  });

  it('pre-fills the schedule holding the previous form’s period (.37)', () => {
    const weekly: ScheduleWithPeriods = {
      id: 'weekly',
      name: 'Weekly',
      periods: [],
    };
    expect(defaultScheduleId([weekly, monthly], form('nov'))).toBe('monthly');
  });
});

describe('periodSelection (OMS-REG-REPL-07.39–.42)', () => {
  it('offers every period, none pre-selected, on a first form', () => {
    const result = periodSelection(monthly, undefined);
    expect(result.options.map(o => o.disabled)).toEqual([false, false, false]);
    expect(result.defaultPeriodId).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it('disables periods at or before the last-used and pre-selects the next (.39 .40)', () => {
    const result = periodSelection(monthly, form('nov'));
    // Newest-first: Dec selectable, Nov and Oct disabled.
    expect(result.options.map(o => o.disabled)).toEqual([false, true, true]);
    expect(result.defaultPeriodId).toBe('dec');
    expect(result.error).toBeUndefined();
  });

  it('disables an in-use period (rules § creation 4)', () => {
    const withUsed: ScheduleWithPeriods = {
      ...monthly,
      periods: monthly.periods.map(p =>
        p.id === 'dec' ? { ...p, inUse: true } : p
      ),
    };
    const result = periodSelection(withUsed, undefined);
    expect(result.options.find(o => o.option.id === 'dec')?.disabled).toBe(
      true
    );
  });

  it('blocks while the previous form is a draft (.41)', () => {
    const result = periodSelection(monthly, form('nov', 'DRAFT'));
    expect(result.error).toBe('previous-not-finalised');
    expect(result.defaultPeriodId).toBeUndefined();
  });

  it('reports exhaustion when no period is left (.42)', () => {
    const result = periodSelection(monthly, form('dec'));
    expect(result.error).toBe('no-available-periods');
    expect(result.defaultPeriodId).toBeUndefined();
  });

  it('treats a previous period absent from the schedule as no anchor, not exhaustion', () => {
    const anchorElsewhere = {
      ...form('nov'),
      period: {
        id: 'sep',
        name: 'Sep 2024',
        startDate: '2024-09-01',
        endDate: '2024-09-30',
      },
    };
    const result = periodSelection(monthly, anchorElsewhere);
    expect(result.error).toBeUndefined();
    expect(result.defaultPeriodId).toBeUndefined();
    // The date gate still applies against the anchor's end.
    expect(result.options.map(o => o.disabled)).toEqual([false, false, false]);
  });
});

describe('defaultSupplierId (OMS-REG-REPL-07.10 .38)', () => {
  it('pre-selects nothing with no history (.10)', () => {
    expect(defaultSupplierId(undefined)).toBeUndefined();
  });

  it('pre-fills the previous form’s supplier (.38)', () => {
    expect(defaultSupplierId(form('nov'))).toBe('supplier-1');
  });
});
