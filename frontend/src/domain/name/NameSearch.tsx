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
  /** Which role to offer — supplier (default), donor, or manufacturer. */
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

// One dropdown option row: a kind icon (truck = external party, building = a
// party that is itself another store in the system), then the code (bold) and
// name, with an "(On hold)" suffix for an on-hold name (rendered but not
// selectable — see onSelect). The row shows both code and name; the selected
// input shows only the name (itemToString below).
const renderRow = (name: NameOption): JSX.Element => (
  <span
    style={{ display: 'inline-flex', 'align-items': 'center', gap: '0.5rem' }}
  >
    {name.isStore ? <HomeIcon /> : <TruckIcon />}
    <span
      data-testid="name-option-code"
      style={{ 'font-weight': 'var(--weight-bold)' }}
    >
      {name.code}
    </span>
    <span data-testid="name-option-name">{name.name}</span>
    {name.isOnHold ? <span>{t('name.on-hold-suffix')}</span> : null}
  </span>
);

/**
 * Reusable name picker — a supplier lookup, or (role="donor"/"manufacturer")
 * the donor / manufacturer picker. A thin binding over the generic AsyncCombobox:
 * it supplies the `names`-query fetcher (narrowed by role + visible in store)
 * and the option row; AsyncCombobox owns the combobox + pagination. An on-hold
 * name is shown but not selectable: the row carries the "(On hold)" suffix and
 * onSelect ignores it. A pre-set `selected` keeps its label visible even when it
 * isn't on the loaded page (AsyncCombobox's selectedItem support).
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
    renderItem={renderRow}
    value={props.selected?.id}
    selectedItem={props.selected}
    // An on-hold name is not selectable: ignore the pick, keep the picker open
    // for another choice.
    onSelect={name => {
      if (name?.isOnHold) return;
      props.onSelect(name);
    }}
  />
);
