import { type JSX } from 'solid-js';
import { AsyncCombobox } from '../../ui/elements/selectors/AsyncCombobox';
import { t, localisedDate } from '../../intl';
import {
  patientSearchPageFetcher,
  type PatientOption,
} from './patientResource';

export interface PatientSearchProps {
  label: string;
  storeId: string;
  /**
   * The currently-selected patient (the controlled value) — the object, not a
   * bare id, because an async picker has no client list to resolve an id
   * against; the caller holds it from its own data (e.g. a patient's next of
   * kin). Omit for a fresh picker.
   */
  selected?: PatientOption;
  /** The picked patient, or null when the selection is cleared. */
  onSelect: (patient: PatientOption | null) => void;
  placeholder?: string;
  hideLabel?: boolean;
  disabled?: boolean;
  /** Inline error text shown under the field. */
  error?: string;
  /** Override the input's `data-testid` (defaults to `patient-search-input`). */
  inputTestId?: string;
  /** Whether the selection can be cleared (default true). */
  clearable?: boolean;
  class?: string;
}

// One option row (spec/patients S4): the code (emphasised), the date of birth,
// then the derived name. Code and name are separately-marked nodes
// (e2e/TESTIDS.md item-option-code / -name).
const renderRow = (patient: PatientOption): JSX.Element => (
  <span
    style={{ display: 'inline-flex', 'align-items': 'center', gap: '0.5rem' }}
  >
    <span
      data-testid="item-option-code"
      style={{ 'font-weight': 'var(--weight-bold)' }}
    >
      {patient.code}
    </span>
    {patient.dateOfBirth ? (
      <span>{localisedDate(patient.dateOfBirth)}</span>
    ) : null}
    <span data-testid="item-option-name">{patient.name}</span>
  </span>
);

/**
 * Reusable patient picker (spec/patients S4) — an AsyncCombobox in server mode
 * driving local `patientSearch` on the typed text (matched as an identifier,
 * debounced). Each option shows code · date of birth · name; the selected input
 * shows the derived name. A thin binding over AsyncCombobox: it supplies the
 * search fetcher + the option row; the combobox owns the input/listbox/paging.
 *
 * Consumed by other surfaces (prescriptions, next-of-kin). The allow-create /
 * allow-edit inline affordances (spec/patients AC-S6) are added by their
 * consuming verticals when built — see the implementation flags.
 */
export const PatientSearch = (props: PatientSearchProps): JSX.Element => (
  <AsyncCombobox<PatientOption>
    label={props.label}
    hideLabel={props.hideLabel}
    class={props.class}
    disabled={props.disabled}
    error={props.error}
    placeholder={props.placeholder ?? t('messages.type-to-search')}
    inputTestId={props.inputTestId ?? 'patient-search-input'}
    clearable={props.clearable}
    fetchPage={patientSearchPageFetcher(props.storeId)}
    itemToString={patient => patient.name}
    itemToValue={patient => patient.id}
    renderItem={renderRow}
    selected={props.selected}
    onSelect={props.onSelect}
  />
);
