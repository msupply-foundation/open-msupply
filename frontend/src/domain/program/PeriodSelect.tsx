import { type JSX } from 'solid-js';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import type { PeriodItem } from './programResource';

export interface PeriodSelectProps {
  label: string;
  /** The pickable periods (already begun — the caller fetches/narrows). */
  periods: PeriodItem[];
  loading?: boolean;
  /** Selected period id (undefined = none). */
  value?: string;
  /** The picked period, or null when the selection is cleared. */
  onChange: (period: PeriodItem | null) => void;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}

/*
 * The report-argument PERIOD picker (spec/reports OMS-REG-RPT-10.31) — a
 * Combobox over periods that have already begun, labelled by name. The
 * consumer owns the fork-on-scoped-key write (`periodSearchWrites`) and the
 * find-by-program cascade; this is just the option list. Also the period step
 * of the schedule cascade (OMS-REG-RPT-10.35), fed the chosen schedule's own
 * periods.
 */
export const PeriodSelect = (props: PeriodSelectProps): JSX.Element => (
  <Combobox<PeriodItem>
    label={props.label}
    items={props.periods}
    loading={props.loading}
    itemToString={period => period.name}
    itemToValue={period => period.id}
    value={props.value}
    disabled={props.disabled}
    error={props.error}
    placeholder={props.placeholder}
    onChange={period => props.onChange(period)}
  />
);
