import { type JSX } from 'solid-js';
import { AsyncCombobox } from '../../ui/elements/selectors/AsyncCombobox';
import { t } from '../../intl';
import { customerPageFetcher, type Customer } from './customerResource';

const PAGE_SIZE = 30;

export interface CustomerSelectProps {
  /** The store whose customers to search — from the caller (like ItemSearch),
   * so the guard-resolved store the lookup depends on is visible at the call
   * site. */
  storeId: string;
  /** Selected customer id (undefined = none). */
  value?: string;
  /**
   * The selected customer's node, when the caller already holds it (e.g. a
   * detail toolbar showing the record's current customer). Seeded into the
   * option list so a controlled `value` resolves even before its page is
   * fetched.
   */
  selected?: Customer;
  /** Fires with the chosen customer (the full node), or null when cleared. */
  onChange: (customer: Customer | null) => void;
  /** Field label (required for a11y). */
  label: string;
  /**
   * Hide the label visually (kept for a11y) — for use where the surrounding
   * layout already shows it.
   */
  hideLabel?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  /** Open the option list on focus/click (pick-first flows). */
  openOnFocus?: boolean;
  /** `data-testid` for the input (e.g. `customer-search-input`). */
  testId?: string;
}

// One option row: code — name, with an "(On hold)" suffix for an on-hold
// customer (listed but not selectable via itemDisabled). Code and name are
// separately-marked nodes (e2e/TESTIDS.md item-option-code / -name).
const renderRow = (c: Customer): JSX.Element => (
  <span>
    <span data-testid="item-option-code">{c.code}</span>
    {' — '}
    <span data-testid="item-option-name">{c.name}</span>
    {c.isOnHold ? ` (${t('label.on-hold')})` : ''}
  </span>
);

/*
 * The customer lookup (spec/ui-standards/components.md § name / customer
 * lookup): a thin binding over the generic AsyncCombobox over the store's
 * customers — typing refetches (filtered by code or name server-side),
 * scrolling loads the next page, and a pre-set `selected` shows its label even
 * before its page is fetched. On-hold customers are listed but disabled
 * (itemDisabled) — the current app's customer-picker behaviour.
 */
export const CustomerSelect = (props: CustomerSelectProps): JSX.Element => (
  <AsyncCombobox<Customer>
    label={props.label}
    hideLabel={props.hideLabel}
    disabled={props.disabled}
    error={props.error}
    placeholder={props.placeholder}
    openOnFocus={props.openOnFocus}
    inputTestId={props.testId}
    fetchPage={customerPageFetcher(props.storeId, PAGE_SIZE)}
    itemToString={c => c.name}
    itemToValue={c => c.id}
    itemDisabled={c => c.isOnHold}
    renderItem={renderRow}
    value={props.value}
    selected={props.selected}
    onSelect={c => props.onChange(c)}
  />
);
