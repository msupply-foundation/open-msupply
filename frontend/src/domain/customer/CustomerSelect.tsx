import { type JSX } from 'solid-js';
import { useParams } from '@solidjs/router';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { t } from '../../intl';
import { createPaginatedSearch } from '../search/createPaginatedSearch';
import { customerPageFetcher, type Customer } from './customerResource';

const PAGE_SIZE = 30;

export interface CustomerSelectProps {
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

/*
 * The customer lookup (spec/ui-standards/components.md § name / customer
 * lookup): the shared Combobox in SERVER mode over the store's customers —
 * typing refetches (filtered by code or name server-side), scrolling to the
 * bottom loads the next page — mirroring ItemSearch and the current app's
 * infinite customer search. Each option shows code and name; on-hold
 * customers are listed but disabled — suffixed "(On hold)" and not selectable
 * (the current app's customer-picker behaviour; the consuming vertical cites
 * the AC).
 */
export const CustomerSelect = (props: CustomerSelectProps): JSX.Element => {
  const params = useParams<{ storeId: string }>();
  // Created ONCE so the accumulated pages and debounce keep a stable owner
  // (see createPaginatedSearch).
  const search = createPaginatedSearch<Customer>({
    fetchPage: customerPageFetcher(params.storeId, PAGE_SIZE),
  });

  // The caller's selected node leads the list (deduped) so a controlled
  // `value` always resolves, even before — or regardless of — its page.
  const items = (): Customer[] => {
    const seed = props.selected;
    if (!seed) return search.items();
    return [seed, ...search.items().filter(c => c.id !== seed.id)];
  };

  return (
    <Combobox<Customer>
      label={props.label}
      hideLabel={props.hideLabel}
      items={items()}
      loading={search.loading()}
      loadingMore={search.loadingMore()}
      itemToString={c => c.name}
      itemToValue={c => c.id}
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
      onInputChange={value => search.setSearch(value)}
      onReachEnd={() => search.loadMore()}
      onChange={c => props.onChange(c)}
    />
  );
};
