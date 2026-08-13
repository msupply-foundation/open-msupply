import { createSignal, Show, type JSX } from 'solid-js';
import { createStore } from 'solid-js/store';
import { AsyncCombobox } from '../../ui/elements/selectors/AsyncCombobox';
import { StatusBadge } from '../../ui/elements/feedback/StatusBadge';
import { formatNumber } from '../../intl/formatNumber';
import { t } from '../../intl';
import {
  itemPageFetcher,
  presencePatch,
  type ItemOption,
} from './itemResource';
import type { FocusTarget } from '../../ui/utils/createFocusTarget';
import styles from './ItemSearch.module.css';

const PAGE_SIZE = 30;

export interface ItemSearchProps {
  label: string;
  storeId: string;
  /**
   * Item ids to hide from the results. Optional, and NOT for hiding items the
   * document already holds — every line editor omits it, so an add-item lookup
   * offers those items and picking one loads their existing entry
   * (spec/ui-standards/controls.md § async lookup). Reserved for structural
   * exclusions, e.g. an item cannot be its own bundled/ancillary variant.
   */
  excludeItemIds?: string[];
  /**
   * Restrict results to items on this master list. A program shares its
   * master list's id, so a program-scoped picker (e.g. a prescription with a
   * program assigned) passes the program id here directly.
   */
  masterListId?: string;
  /**
   * The currently-selected item's id (controlled). Shows that item as the
   * value while still allowing a new search — e.g. the picked item stays in
   * the picker after selection so it can be swapped for another.
   */
  value?: string;
  /**
   * The selected item's label fields, for when `value` is an item that ISN'T
   * in the search's own paginated results (e.g. an item the stocktake editor
   * opened from a row, not from a search). Without it the combobox can't
   * resolve the id to a label and shows blank. Only code/name are needed to
   * render the label.
   */
  selectedItem?: { id: string; code: string; name: string };
  /** The picked item, or null when the selection is cleared. */
  onSelect: (item: ItemOption | null) => void;
  placeholder?: string;
  hideLabel?: boolean;
  /**
   * Read-only: show the selected item but don't allow searching/changing it.
   */
  disabled?: boolean;
  error?: string;
  /** Marks the field required — passed through to the combobox's label. */
  required?: boolean;
  /**
   * A `createFocusTarget()` handle bound to the search input — for an owner
   * that focuses this picker after an action (e.g. a dialog opening on it).
   */
  focusTarget?: FocusTarget;
  /**
   * Offer only items with stock on hand (server-side ItemFilterInput
   * .hasStockOnHand) — the stock-movement line editor's item search.
   */
  hasStockOnHand?: boolean;
  /** Passed through to the underlying combobox field (sizing/placement). */
  class?: string;
  /**
   * Max-width cap, the shared input vocabulary — passed through to the
   * combobox (`full` = fill the container, e.g. a line editor's item row).
   */
  width?: 'compact' | 'short' | 'long' | 'full';
  /**
   * Mark options for items the caller's document already holds
   * (spec/ui-standards/controls.md § async lookup, D115): after each fetched
   * page, `probe` receives that page's item ids and resolves the subset
   * already on the document (undefined on a failed fetch → that page just
   * goes unmarked). A present item's row carries `label` as a textual
   * end-of-row badge and stays fully selectable — picking it loads the
   * existing entry.
   */
  presentInDocument?: {
    probe: (itemIds: string[]) => Promise<string[] | undefined>;
    label: string;
  };
}

/**
 * Reusable server-side-filtered, infinite-scroll item picker (add-item flow) —
 * a thin binding over the generic AsyncCombobox: it supplies the `items`-query
 * fetcher (excluding `excludeItemIds` server-side) and the option row;
 * AsyncCombobox owns the combobox + pagination.
 */
export const ItemSearch = (props: ItemSearchProps): JSX.Element => {
  // The fetcher reads the exclusions accessor per call, so a later change is
  // picked up on the next fetch. excludeItemIds is optional — every line
  // editor omits it → default to [].
  const basePage = itemPageFetcher(
    props.storeId,
    () => props.excludeItemIds ?? [],
    PAGE_SIZE,
    () => props.hasStockOnHand,
    () => props.masterListId
  );

  // itemId → already-on-document, filled page-by-page by the caller's
  // presentInDocument probe. Accumulates across pages; each probe answer
  // overwrites its own page's ids wholesale (presencePatch), so a mark that
  // no longer holds (lines deleted since) clears on that page's next probe.
  const [present, setPresent] = createStore<Record<string, boolean>>({});

  // The probe rides the page fetch — awaited before the page is handed to the
  // combobox — so a page's marks land together with its rows (no badge
  // pop-in a beat after the list renders).
  const fetchPage = async (search: string, offset: number) => {
    const page = await basePage(search, offset);
    const presence = props.presentInDocument;
    if (page && presence && page.nodes.length > 0) {
      const ids = page.nodes.map(node => node.id);
      const found = await presence.probe(ids);
      if (found) setPresent(presencePatch(ids, found));
    }
    return page;
  };

  // One option row: "code - name" at the inline-start, "{total} Units" at the
  // end — a fixed, localised "Units" label for every item (see the note
  // below). Code and name are separately-marked nodes (e2e/TESTIDS.md
  // item-option-code / -name) so the suites can read either regardless of the
  // datafile's format. Between them, the already-on-document badge (D115) for
  // rows the presence probe marked.
  const renderRow = (item: ItemOption): JSX.Element => (
    <span class={styles.row}>
      <span class={styles.label}>
        <span data-testid="item-option-code">{item.code}</span>
        {' - '}
        <span data-testid="item-option-name">{item.name}</span>
      </span>
      <Show when={present[item.id] ? props.presentInDocument : undefined}>
        {presence => (
          <span class={styles.present} data-testid="item-option-present">
            <StatusBadge label={presence().label} tone="neutral" />
          </span>
        )}
      </Show>
      <span class={styles.total}>
        {/* Fixed, localised "Units" label for every item (old-app parity — the
            item's own unitName is untranslatable catalogue data). */}
        {formatNumber(item.availableUnits)} {t('label.units')}
      </span>
    </span>
  );

  // Remember the last full option the user picked. Once an item is selected the
  // input holds its "code - name" label, which the server's codeOrName search
  // can't match — so a reopened dropdown fetches NO rows for it, and the
  // combobox would fall back to the label-only seed (placeholder zeros → "0
  // Units"). Seeding the picked option keeps its real available figure; ignored
  // once the controlled value moves off it, and null again on deselect.
  const [picked, setPicked] = createSignal<ItemOption | null>(null);
  const seed = (): ItemOption | undefined => {
    const p = picked();
    if (p && props.value === p.id) return p;
    if (!props.selectedItem) return undefined;
    // Label-only fallback for a row-click / walk-advance open (no pick this
    // session — the picker is read-only there, so these zeros never surface in
    // a reopened dropdown). Only code/name feed the label.
    return {
      id: props.selectedItem.id,
      code: props.selectedItem.code,
      name: props.selectedItem.name,
      unitName: null,
      availableUnits: 0,
      isVaccine: false,
      doses: 0,
      defaultPackSize: 1,
      defaultSellPricePerPack: 0,
    };
  };

  return (
    <AsyncCombobox<ItemOption>
      label={props.label}
      hideLabel={props.hideLabel}
      disabled={props.disabled}
      error={props.error}
      required={props.required}
      class={props.class}
      width={props.width}
      placeholder={props.placeholder}
      // Every ItemSearch IS the contract's item search — the fixed id is
      // stamped here (like ConfirmDialog's confirmation-modal), not per call
      // site (e2e/TESTIDS.md).
      inputTestId="item-search-input"
      focusTarget={props.focusTarget}
      fetchPage={fetchPage}
      value={props.value}
      selected={seed()}
      itemToString={item => `${item.code} - ${item.name}`}
      itemToValue={item => item.id}
      renderItem={renderRow}
      onSelect={item => {
        setPicked(item);
        props.onSelect(item);
      }}
    />
  );
};
