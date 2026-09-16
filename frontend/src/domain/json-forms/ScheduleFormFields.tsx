import { createMemo, createResource, type JSX } from 'solid-js';
import { gated } from '../../api/gated';
import { t } from '../../intl';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { DateField } from '../../ui/elements/inputs/DateField';
import { ProgramListSelect } from '../program/ProgramListSelect';
import { PeriodSelect } from '../program/PeriodSelect';
import {
  fetchSchedulesWithPeriods,
  type ProgramListItem,
  type ScheduleWithPeriods,
} from '../program/programResource';
import {
  dayEndInstant,
  dayStartInstant,
  instantToLocalDate,
  scheduleCascadeWrites,
  type ReportArgs,
} from './schema';

export interface ScheduleFormFieldsProps {
  storeId: string;
  /** The store's visible programs (the modal's one programs fetch). */
  programs: ProgramListItem[];
  programsLoading?: boolean;
  /** The five flat argument values the cascade reads back (AC-R17). */
  programId?: string;
  scheduleId?: string;
  periodId?: string;
  after?: string;
  before?: string;
  /** One batched write per interaction — key → value, undefined = remove. */
  onWrites: (writes: ReportArgs) => void;
  /**
   * Required-miss message for one of the five flat keys (the modal owns the
   * attempted/required state — AC-R17's gating); undefined = no error.
   */
  errorFor?: (key: string) => string | undefined;
}

/*
 * The schedule cascade (spec/reports S3, AC-R17): program → schedule → period
 * rows plus editable from/to dates, writing five FLAT argument keys via
 * `scheduleCascadeWrites` — the control's own scoped key is deliberately
 * ignored (contract "Arguments": the captured client never populates it).
 * Each downstream row waits disabled for its parent; a parent change wipes
 * everything below it; a period pick fills the dates with the period's span,
 * which the date fields can still override.
 */
export const ScheduleFormFields = (
  props: ScheduleFormFieldsProps
): JSX.Element => {
  // The chosen program's schedules (with their closed periods) — refetched
  // when the program changes; no program, no fetch. `gated` read so a
  // pending fetch never trips an ancestor <Suspense>
  // (kdd/solid-reactivity-pitfalls).
  const [schedulesData] = createResource(
    () =>
      props.programId
        ? JSON.stringify({ storeId: props.storeId, programId: props.programId })
        : undefined,
    async serialised => {
      const vars = JSON.parse(serialised) as {
        storeId: string;
        programId: string;
      };
      return fetchSchedulesWithPeriods(vars.storeId, vars.programId);
    }
  );
  const schedules = (): ScheduleWithPeriods[] =>
    props.programId ? (gated(schedulesData) ?? []) : [];

  // The period options are the CHOSEN schedule's own list — no extra query
  // (AC-R17).
  const periods = createMemo(() => {
    const schedule = schedules().find(s => s.id === props.scheduleId);
    return schedule ? schedule.periods.map(sp => sp.period) : [];
  });

  return (
    <>
      <ProgramListSelect
        label={t('label.program')}
        programs={props.programs}
        loading={props.programsLoading}
        value={props.programId}
        error={props.errorFor?.('programId')}
        onChange={pick =>
          props.onWrites(
            scheduleCascadeWrites.program(
              pick === 'all' || pick === null ? undefined : pick.id
            )
          )
        }
      />
      {/* Each waiting step says what unlocks it (ui-standards inputs ›
          fields): the placeholder names the prerequisite pick (AC-R17). */}
      <Combobox<ScheduleWithPeriods>
        label={t('label.schedule')}
        items={schedules()}
        loading={props.programId !== undefined && schedulesData.loading}
        itemToString={schedule => schedule.name}
        itemToValue={schedule => schedule.id}
        value={props.scheduleId}
        disabled={!props.programId}
        placeholder={
          props.programId ? undefined : t('message.select-program-first')
        }
        error={props.errorFor?.('scheduleId')}
        onChange={schedule =>
          props.onWrites(scheduleCascadeWrites.schedule(schedule?.id))
        }
      />
      <PeriodSelect
        label={t('label.period')}
        periods={periods()}
        value={props.periodId}
        disabled={!props.scheduleId}
        placeholder={
          props.scheduleId ? undefined : t('message.select-schedule-first')
        }
        error={props.errorFor?.('periodId')}
        onChange={period =>
          props.onWrites(scheduleCascadeWrites.period(period))
        }
      />
      <DateField
        label={t('label.from-date')}
        value={instantToLocalDate(props.after) || null}
        error={props.errorFor?.('after')}
        onChange={value =>
          props.onWrites({
            after: value ? dayStartInstant(value) : undefined,
          })
        }
      />
      <DateField
        label={t('label.to-date')}
        value={instantToLocalDate(props.before) || null}
        error={props.errorFor?.('before')}
        onChange={value =>
          props.onWrites({
            before: value ? dayEndInstant(value) : undefined,
          })
        }
      />
    </>
  );
};
