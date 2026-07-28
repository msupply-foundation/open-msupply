import { Show, type JSX } from 'solid-js';
import { AsyncCombobox } from '../../ui/elements/selectors/AsyncCombobox';
import { Button } from '../../ui/elements/buttons/Button';
import { PlusCircleIcon } from '../../ui/icons';
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
  /** Control size — `small` for a header field cluster's compact row. */
  size?: 'default' | 'small';
  disabled?: boolean;
  /** Inline error text shown under the field. */
  error?: string;
  /** Override the input's `data-testid` (defaults to `patient-search-input`). */
  inputTestId?: string;
  /** Whether the selection can be cleared (default true). */
  clearable?: boolean;
  class?: string;
  /**
   * When set, a **Create patient** affordance is offered beside the picker
   * (spec/patients S4 allow-create; the create-on-no-match flow, e.g.
   * prescriptions AC-C5). The consuming vertical opens its own patient-create
   * flow from this callback and selects the result via `onSelect`.
   */
  onCreatePatient?: () => void;
}

// One option row (spec/patients S4): the code (emphasised), the date of birth,
// then the derived name. Code, date of birth, and name are separately-marked
// nodes (e2e/TESTIDS.md item-option-code / -dob / -name).
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
      <span data-testid="item-option-dob">
        {localisedDate(patient.dateOfBirth)}
      </span>
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
 * The empty query is gated (spec/patients S4): an unqueried picker does NOT list
 * every site patient — it shows the `messages.type-to-search` hint ("Start
 * typing to search") in place of results and issues no request until text is
 * typed. Once a search settles with no match the copy switches to
 * `messages.no-matching-patients` — the fact the user is actually after
 * (OMS-REG-DIS-01 `.52`, D68).
 *
 * Consumed by other surfaces (prescriptions, next-of-kin). The allow-edit
 * inline affordance (spec/patients S4) is added by its consuming vertical when
 * built — see the implementation flags.
 */
export const PatientSearch = (props: PatientSearchProps): JSX.Element => (
  <AsyncCombobox<PatientOption>
    label={props.label}
    hideLabel={props.hideLabel}
    size={props.size}
    class={props.class}
    disabled={props.disabled}
    error={props.error}
    placeholder={props.placeholder}
    inputTestId={props.inputTestId ?? 'patient-search-input'}
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
    selected={props.selected}
    onSelect={props.onSelect}
    // Create-patient entry (opt-in) at the foot of the result list, offered
    // once text is typed — so it's there in the no-match state, which is what
    // it's for (spec/patients S4). It lives in the popup rather than beside the
    // input because the field is often in a dialog, where a sibling button has
    // no room: the picker's own min-content already fills the column.
    listboxFooter={query => (
      <Show when={props.onCreatePatient && query().trim() !== ''}>
        <Button
          variant="secondary"
          icon={<PlusCircleIcon />}
          disabled={props.disabled}
          data-testid="create-patient-button"
          onClick={() => props.onCreatePatient?.()}
        >
          {t('label.create-patient')}
        </Button>
      </Show>
    )}
  />
);
