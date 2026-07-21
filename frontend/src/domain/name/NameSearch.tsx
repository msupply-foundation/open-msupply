import { type JSX } from 'solid-js';
import { AsyncCombobox } from '../../ui/elements/selectors/AsyncCombobox';
import { HomeIcon, TruckIcon } from '../../ui/icons';
import { t } from '../../intl';
import {
  namePageFetcher,
  type NameOption,
  type NameRole,
} from './nameResource';

const PAGE_SIZE = 30;

export interface NameSearchProps {
  label: string;
  storeId: string;
  /** Which role to offer — supplier (default), customer, donor, or manufacturer. */
  role?: NameRole;
  /**
   * The currently-selected name (the controlled value). The object — not a bare
   * id — because an async picker has no client-side list to resolve an id
   * against; the caller holds the name from its own data (e.g. a shipment's
   * supplier), and AsyncCombobox uses it to render the selection's label even
   * before its page loads. Omit for a fresh picker with no pre-set value.
   */
  selected?: NameOption;
  /** The picked name, or null when the selection is cleared. */
  onSelect: (name: NameOption | null) => void;
  placeholder?: string;
  hideLabel?: boolean;
  disabled?: boolean;
  class?: string;
}

// One option row: a kind icon (a house in the PRIMARY colour = a party that is
// itself another store in the system, a truck in the SECONDARY colour = an
// external party), then the code (bold) and name, with an "(On hold)" suffix
// for an on-hold name (listed but not selectable via itemDisabled). Code and
// name are separately-marked nodes (e2e/TESTIDS.md item-option-code / -name).
// The row shows both; the selected input shows only the name (itemToString
// below).
const renderRow = (name: NameOption): JSX.Element => (
  <span
    style={{ display: 'inline-flex', 'align-items': 'center', gap: '0.5rem' }}
  >
    {name.isStore ? (
      <HomeIcon style={{ color: 'var(--primary-main)' }} />
    ) : (
      <TruckIcon style={{ color: 'var(--secondary-main)' }} />
    )}
    <span
      data-testid="item-option-code"
      style={{ 'font-weight': 'var(--weight-bold)' }}
    >
      {name.code}
    </span>
    <span data-testid="item-option-name">{name.name}</span>
    {name.isOnHold ? ` (${t('label.on-hold')})` : null}
  </span>
);

/**
 * Reusable party picker for every `names` lookup — supplier, customer, donor,
 * or manufacturer (role selects the NameFilterInput flag; a "customer" is just
 * a name with isCustomer, not a separate entity, so one component covers all).
 * A thin binding over the generic AsyncCombobox: it supplies the `names`-query
 * fetcher (narrowed by role + visible in store) and the option row;
 * AsyncCombobox owns the combobox + pagination. An on-hold name is listed but
 * not selectable (itemDisabled). A pre-set `selected` keeps its label visible
 * even before its page loads.
 */
export const NameSearch = (props: NameSearchProps): JSX.Element => (
  <AsyncCombobox<NameOption>
    label={props.label}
    hideLabel={props.hideLabel}
    class={props.class}
    disabled={props.disabled}
    placeholder={props.placeholder}
    inputTestId="name-search-input"
    fetchPage={namePageFetcher(
      props.storeId,
      props.role ?? 'supplier',
      PAGE_SIZE
    )}
    // The selected value's input text is just the name; the dropdown row still
    // shows code + name. Server mode disables the client filter, so this isn't
    // used for filtering — the `names` query searches codeOrName regardless.
    itemToString={name => name.name}
    itemToValue={name => name.id}
    itemDisabled={name => name.isOnHold}
    renderItem={renderRow}
    selected={props.selected}
    onSelect={props.onSelect}
  />
);
