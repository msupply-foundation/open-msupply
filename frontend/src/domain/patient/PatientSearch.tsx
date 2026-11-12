import type { JSX } from 'solid-js';
import { AsyncCombobox } from '../../ui/elements/selectors/AsyncCombobox';
import { t, localisedDate } from '../../intl';
import type { FocusTarget } from '../../ui/utils/createFocusTarget';
import {
  patientSearchPageFetcher,
  type PatientOption,
} from './patientResource';
import styles from './PatientSearch.module.css';

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
  /** Control size — `small` for a header field cluster's compact row. */
  size?: 'default' | 'small';
  /** Width cap — `full` to fill the slot a layout hands it (header clusters). */
  width?: 'compact' | 'short' | 'long' | 'full';
  disabled?: boolean;
  /** Inline error text shown under the field. */
  error?: string;
  /**
   * Override the input's `data-testid` (defaults to `patient-search-input`).
   */
  inputTestId?: string;
  /** Whether the selection can be cleared (default true). */
  clearable?: boolean;
  /**
   * A `createFocusTarget()` handle bound to the search input — for an owner
   * that focuses this picker after an action (e.g. a dialog opening on it).
   */
  focusTarget?: FocusTarget;
  class?: string;
}

// One option row (spec/patients S4): the code (emphasised), the date of birth,
// then the derived name. Code, date of birth, and name are separately-marked
// nodes (e2e/TESTIDS.md item-option-code / -dob / -name). Layout in
// PatientSearch.module.css — the identifiers hold their line, the name wraps in
// what's left.
const renderRow = (patient: PatientOption): JSX.Element => (
  <span class={styles.row}>
    <span class={styles.code} data-testid="item-option-code">
      {patient.code}
    </span>
    {patient.dateOfBirth ? (
      <span class={styles.dob} data-testid="item-option-dob">
        {localisedDate(patient.dateOfBirth)}
      </span>
    ) : null}
    <span class={styles.name} data-testid="item-option-name">
      {patient.name}
    </span>
  </span>
);

/**
 * Reusable patient picker (spec/patients S4) — an AsyncCombobox in server mode
 * driving local `patientSearch` on the typed text (matched as an identifier,
 * debounced). Each option shows code · date of birth · name; the selected input
 * shows the derived name. A thin binding over AsyncCombobox: it supplies the
 * search fetcher + the option row; the combobox owns the input/listbox/paging.
 *
 * The empty query is gated (spec/patients S4): an unqueried picker does NOT
 * list every site patient — it shows the `messages.type-to-search` hint
 * ("Start typing to search") in place of results and issues no request until
 * text is typed. Once a search settles with no match the copy switches to
 * `messages.no-matching-patients` — the fact the user is actually after
 * (OMS-REG-DIS-01 `.52`, D68).
 *
 * Now only the next-of-kin field's picker: a record's patient is picked in
 * the patient search instead (#631; sections/patients/list/PatientField).
 */
export const PatientSearch = (props: PatientSearchProps): JSX.Element => (
  <AsyncCombobox<PatientOption>
    label={props.label}
    hideLabel={props.hideLabel}
    size={props.size}
    width={props.width}
    class={props.class}
    disabled={props.disabled}
    error={props.error}
    placeholder={props.placeholder}
    inputTestId={props.inputTestId ?? 'patient-search-input'}
    focusTarget={props.focusTarget}
    noResultsMessage={t('messages.no-matching-patients')}
    emptyQueryMessage={t('messages.type-to-search')}
    clearable={props.clearable}
    fetchPage={(search, offset) =>
      search.trim() === ''
        ? Promise.resolve({ nodes: [], totalCount: 0 })
        : patientSearchPageFetcher(props.storeId)(search, offset)
    }
    itemToString={patient => patient.name}
    itemToValue={patient => patient.id}
    renderItem={renderRow}
    // Let the popup grow past a narrow field — the field is often a dialog
    // column or a header cluster's compact slot, and at that width a patient's
    // code + date of birth + name has nowhere to go (#1041). Same treatment as
    // the location pickers.
    matchTriggerWidth={false}
    selected={props.selected}
    onSelect={props.onSelect}
  />
);
