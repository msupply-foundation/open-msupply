import type {
  ProgramListItem,
  ScheduleWithPeriods,
} from '@/domain/program/programResource';
import type { RnrFormRowFragment } from '../rnrForms.generated';
import { isFinalised } from '../rnrFormStatus';

// The create modal's selection logic (spec/rnr-forms/rules.md § creation;
// ui-surface S2): program/schedule auto-selection and prefill-from-history,
// the closed-period sequence gating, and the two period error states. Pure —
// the modal component owns the signals and calls these. The option shapes are
// the shared program domain module's reads (src/domain/program).

export type PeriodOption = ScheduleWithPeriods['periods'][number];

/** The program picker's options: requisition programs only — immunisation
 * programs are excluded (ui-surface S2). */
export const programOptions = (
  programs: ProgramListItem[]
): ProgramListItem[] => programs.filter(program => !program.isImmunisation);

/** OMS-REG-REPL-07.5/.6/.36: exactly one program auto-selects; otherwise the
 * most recent form's program pre-fills; with no history, none. */
export const defaultProgramId = (
  programs: ProgramListItem[],
  mostRecentForm: RnrFormRowFragment | undefined
): string | undefined => {
  if (programs.length === 1) return programs[0]?.id;
  if (mostRecentForm && programs.some(p => p.id === mostRecentForm.programId))
    return mostRecentForm.programId;
  return undefined;
};

/** OMS-REG-REPL-07.7/.8/.37: exactly one schedule auto-selects; otherwise the
 * schedule holding the most recent form's period pre-fills; else none. */
export const defaultScheduleId = (
  schedules: ScheduleWithPeriods[],
  mostRecentForm: RnrFormRowFragment | undefined
): string | undefined => {
  if (schedules.length === 1) return schedules[0]?.id;
  const previous = schedules.find(schedule =>
    schedule.periods.some(p => p.period.id === mostRecentForm?.period.id)
  );
  return previous?.id;
};

/** The previous form within the chosen program+schedule — the sequence
 * anchor (rules § creation rules 5/6). The caller queries the most recent
 * form filtered to program + schedule; this narrows nothing further. */
export type PeriodSelection = {
  /** Options newest-first (the server's order), each with its gating. */
  options: { option: PeriodOption; disabled: boolean }[];
  /** OMS-REG-REPL-07.39: the next period in sequence, pre-selected. */
  defaultPeriodId: string | undefined;
  /** OMS-REG-REPL-07.41/.42: the blocking states the picker reports. */
  error: 'previous-not-finalised' | 'no-available-periods' | undefined;
};

export const periodSelection = (
  schedule: ScheduleWithPeriods | undefined,
  previousForm: RnrFormRowFragment | undefined
): PeriodSelection => {
  if (!schedule)
    return { options: [], defaultPeriodId: undefined, error: undefined };

  // OMS-REG-REPL-07.40 + rules § creation 4/5: a period already used (inUse)
  // or at/before the last-used period's end is not selectable.
  const lastUsedEnd = previousForm?.period.endDate;
  const options = schedule.periods.map(option => ({
    option,
    disabled:
      option.inUse ||
      (lastUsedEnd !== undefined && option.period.endDate <= lastUsedEnd),
  }));

  // rules § creation 6: a draft previous form blocks the next create.
  if (previousForm && !isFinalised(previousForm.status)) {
    return {
      options,
      defaultPeriodId: undefined,
      error: 'previous-not-finalised',
    };
  }

  // OMS-REG-REPL-07.39: with a finalised previous form, pre-select the next
  // period in sequence — the entry immediately above the last-used one in the
  // newest-first list. Without history nothing is pre-selected (any closed
  // period is a valid first form).
  if (previousForm) {
    const usedIndex = schedule.periods.findIndex(
      p => p.period.id === previousForm.period.id
    );
    const next = usedIndex > 0 ? schedule.periods[usedIndex - 1] : undefined;
    if (!next) {
      // OMS-REG-REPL-07.42: the schedule has no period left.
      return {
        options,
        defaultPeriodId: undefined,
        error: 'no-available-periods',
      };
    }
    return { options, defaultPeriodId: next.period.id, error: undefined };
  }

  return { options, defaultPeriodId: undefined, error: undefined };
};

/** OMS-REG-REPL-07.10/.38: the supplier prefill — the most recent form's,
 * none with no history. An id only: the modal resolves the real NameOption. */
export const defaultSupplierId = (
  mostRecentForm: RnrFormRowFragment | undefined
): string | undefined => mostRecentForm?.supplierId;
