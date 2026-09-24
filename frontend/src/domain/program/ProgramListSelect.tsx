import { createMemo, type JSX } from 'solid-js';
import { t } from '../../intl';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import type { ProgramListItem } from './programResource';

/**
 * What a pick reports: a real program, the "All programs" entry, or a clear.
 * The consumer (the argument form) owns the three-key argument write this
 * drives (spec/reports contract "Arguments", OMS-REG-RPT-10.22).
 */
export type ProgramListPick = ProgramListItem | 'all' | null;

// The sentinel option id the captured client uses for the appended
// "All programs" entry — never a real program id.
const ALL_PROGRAMS_ID = 'AllProgramsSelector';

export interface ProgramListSelectProps {
  /**
   * Selected program id (undefined = none; the All entry is never restored).
   */
  value?: string;
  onChange: (pick: ProgramListPick) => void;
  /** The store's visible programs (already immunisation-filtered if needed). */
  programs: ProgramListItem[];
  loading?: boolean;
  /**
   * Append the translated "All programs" entry — only honoured when more than
   * one program exists (OMS-REG-RPT-10.22, matching the captured control).
   */
  allProgramsOption?: boolean;
  /** Field label (required for a11y). */
  label: string;
  hideLabel?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}

// The option row: a real program or the sentinel All-programs entry, shaped
// alike so the Combobox renders one list.
type Option = { id: string; name: string; program?: ProgramListItem };

/*
 * The report-argument PROGRAM picker (spec/reports OMS-REG-RPT-10.22) — a
 * Combobox over the store's visible programs, labelled by name, optionally
 * with the
 * "All programs" entry appended. Distinct from ProgramSelect (the
 * patient-program-enrolment registry picker, OMS-REG-RPT-10.19): this one's
 * value is the program's own id, and its pick carries the elmisCode /
 * fetchAllPrograms companion semantics the consumer writes.
 */
export const ProgramListSelect = (
  props: ProgramListSelectProps
): JSX.Element => {
  const options = createMemo<Option[]>(() => {
    const programs = props.programs.map(p => ({
      id: p.id,
      name: p.name,
      program: p,
    }));
    return props.allProgramsOption && programs.length > 1
      ? [...programs, { id: ALL_PROGRAMS_ID, name: t('label.all-programs') }]
      : programs;
  });

  return (
    <Combobox<Option>
      label={props.label}
      hideLabel={props.hideLabel}
      items={options()}
      loading={props.loading}
      itemToString={o => o.name}
      itemToValue={o => o.id}
      value={props.value}
      disabled={props.disabled}
      error={props.error}
      placeholder={props.placeholder}
      onChange={o => props.onChange(o === null ? null : (o.program ?? 'all'))}
    />
  );
};
