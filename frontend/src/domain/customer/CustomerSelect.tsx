import { createSignal, type JSX } from 'solid-js';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { t } from '../../intl';
import { createPaginatedSearch } from '../search/createPaginatedSearch';
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
  // Created ONCE so the accumulated pages and debounce keep a stable owner
  // (see createPaginatedSearch). Deferred first fetch (`ensure` on open) —
  // this select mounts with its page (detail toolbar), so one the user never
  // opens never fetches.
  const search = createPaginatedSearch<Customer>({
    fetchPage: customerPageFetcher(props.storeId, PAGE_SIZE),
    eager: false,
  });

  // What the user has typed — mirrors the input so the seed below can drop
  // out of a search it doesn't match.
  const [query, setQuery] = createSignal('');

  // The caller's selected node leads the list (deduped) so a controlled
  // `value` resolves even before its page is fetched — but only while it
  // matches the typed query (or none is typed): an unmatched seed would sort
  // above real matches and mask the "no matches" row (which keys off an empty
  // list).
  const items = (): Customer[] => {
    const seed = props.selected;
    if (!seed) return search.items();
    const needle = query().toLocaleLowerCase();
    const seedMatches =
      !needle ||
      seed.name.toLocaleLowerCase().includes(needle) ||
      seed.code.toLocaleLowerCase().includes(needle);
    if (!seedMatches) return search.items();
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
      // Code and name are separately-marked nodes (e2e/TESTIDS.md
      // item-option-code / -name) so the suites can read either regardless of
      // the datafile's format. Suites target options via role=option — no
      // per-option wrapper id.
      renderItem={c => (
        <span>
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
      onInputChange={value => {
        setQuery(value);
        search.setSearch(value);
      }}
      onOpenChange={open => open && search.ensure()}
      onReachEnd={() => search.loadMore()}
      onChange={c => props.onChange(c)}
    />
  );
};
