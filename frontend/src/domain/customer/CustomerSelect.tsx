import { type JSX } from 'solid-js';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { t } from '../../intl';
import { customersResource, type Customer } from './customerResource';

export interface CustomerSelectProps {
  /** Selected customer id (undefined = none). */
  value?: string;
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
  /** Open the option list on focus/click (pick-first flows, e.g. S2). */
  openOnFocus?: boolean;
  /** `data-testid` for the input (e.g. `customer-search-input`). */
  testId?: string;
}

/*
 * The customer lookup (spec/ui-standards/components.md § customer lookup): a
 * Combobox pre-wired to the store-scoped customers cache, searchable by code
 * or name, each option showing both. On-hold customers are listed but disabled
 * — suffixed "(On hold)" and not selectable (the current app's customer-picker behaviour; the consuming vertical cites the AC).
 */
export const CustomerSelect = (props: CustomerSelectProps): JSX.Element => (
  <Combobox<Customer>
    label={props.label}
    hideLabel={props.hideLabel}
    items={customersResource.noSuspense()}
    loading={customersResource.loading()}
    itemToString={c => c.name}
    itemToValue={c => c.id}
    // Search across code or name (the lookup's contract), not just the label.
    filter={(c, input) => {
      const needle = input.toLocaleLowerCase();
      return (
        c.name.toLocaleLowerCase().includes(needle) ||
        c.code.toLocaleLowerCase().includes(needle)
      );
    }}
    itemDisabled={c => c.isOnHold}
    renderItem={c => (
      <span data-testid={props.testId ? `${props.testId}-option` : undefined}>
        <span data-testid="item-option-code">{c.code}</span>
        {' — '}
        <span data-testid="item-option-name">{c.name}</span>
        {c.isOnHold ? ` (${t('label.on-hold')})` : ''}
      </span>
    )}
    value={props.value}
    disabled={props.disabled}
    error={props.error}
    placeholder={props.placeholder}
    openOnFocus={props.openOnFocus}
    inputTestId={props.testId}
    onChange={c => props.onChange(c)}
  />
);
