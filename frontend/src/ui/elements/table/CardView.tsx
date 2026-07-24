import { For, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import {
  flexRender,
  type Cell as TanCell,
  type Table,
} from '@tanstack/solid-table';
import { LabelledValue } from '../typography/LabelledValue';
import { BareCheckbox } from '../inputs/BareCheckbox';
import { t } from '../../../intl';
import {
  membershipCardGroups,
  type Membership,
  type TabAndCardGroup,
} from './columnTypes';
import styles from './DataTable.module.css';

// A cell's explicit card position, or undefined when it has none — in which
// case it belongs to the card body (rendered below the header, ordered by
// group when grouped), alongside the content positions.
const cellCardPosition = <T,>(
  cell: TanCell<T, unknown>
):
  | 'header-primary'
  | 'header-badge'
  | 'content-primary'
  | 'content-secondary'
  | undefined => cell.column.columnDef.meta?.cardPosition;

// Whether a cell sits in the card HEADER row (either header position) — as
// opposed to the body, which holds every other visible cell.
const cellInHeader = <T,>(cell: TanCell<T, unknown>): boolean => {
  const p = cellCardPosition(cell);
  return p === 'header-primary' || p === 'header-badge';
};

// The column's header text, for a field label. Headers may be a string or
// JSX/function; only the string case yields a readable label (our columns use
// strings), else no label.
const columnHeaderText = <T,>(
  cell: TanCell<T, unknown>
): string | undefined => {
  const header = cell.column.columnDef.header;
  return typeof header === 'string' ? header : undefined;
};

// A cell's column membership (ALL_TABS sentinel | array of group keys |
// undefined).
const cellMembership = <T,>(cell: TanCell<T, unknown>): Membership =>
  (cell.column.columnDef as { tabsAndCardGroups?: Membership })
    .tabsAndCardGroups;

// Whether a cell belongs to a real card GROUP (a declared group key) —
// excludes ALL_TABS, which appears in every tab but is NOT part of card
// grouping.
const cellInGroup = <T,>(cell: TanCell<T, unknown>, key: string): boolean =>
  membershipCardGroups(cellMembership(cell)).includes(key);

// Card view — each row is a card (ui-standards § tables): primary identity
// top-left, a badge top-right, and the rest in the secondary area below. Reuses
// TanStack's row model + visible cells, routing each by its meta.card region;
// selection + row-click mirror the table. When `tabsAndCardGroups` is set
// (kdd/edit-line-card-table), the secondary area is ordered by group — each
// group as its own ROW (icon + its fields); ALL_TABS / ungrouped cells follow,
// unlabelled.
//
// Each card is a full-width table ROW (a <tr> with a single <td>) so card view
// shares the SAME <table> as table view — one scroll container, the header row
// simply hidden. In card view the table has no header and every row is one
// <td>, so it's effectively a one-column table: the cell fills the width with
// no colSpan needed, and the card content wraps rather than scrolling.
export function CardView<T>(props: {
  table: Table<T>;
  tabsAndCardGroups?: TabAndCardGroup<string>[];
  enableSelection: boolean;
  onRowClick?: (row: T) => void;
}): JSX.Element {
  // The DataTable renders the empty state itself (before this view), so cards
  // always have ≥1 row here — no empty branch.
  const rows = () => props.table.getRowModel().rows;
  return (
    <For each={rows()}>
      {row => {
        // Card view drops table-only columns (meta.hideOnCard) at the source,
        // so they appear in neither the header nor the body.
        const cells = () =>
          row
            .getVisibleCells()
            .filter(c => !c.column.columnDef.meta?.hideOnCard);
        const inHeader = (position: 'header-primary' | 'header-badge') =>
          cells().filter(c => cellCardPosition(c) === position);
        // The card body: every visible cell NOT in the header row (the content
        // positions plus un-annotated columns).
        const secondaryCells = () => cells().filter(c => !cellInHeader(c));
        return (
          <tr
            class={`${styles.cardRow} ${props.onRowClick ? styles.rowClickable : ''}`}
            data-selected={row.getIsSelected() ? '' : undefined}
            data-testid="table-row"
            onClick={() => props.onRowClick?.(row.original)}
          >
            <td class={styles.cardCell}>
              <div class={styles.card}>
                <div class={styles.cardHeader}>
                  <Show when={props.enableSelection}>
                    <BareCheckbox
                      class={styles.cardSelect}
                      aria-label={t('table.select-row')}
                      data-testid="select-row-checkbox"
                      checked={row.getIsSelected()}
                      onChange={row.getToggleSelectedHandler()}
                      onClick={event => event.stopPropagation()}
                    />
                  </Show>
                  <div class={styles.cardIdentity}>
                    <For each={inHeader('header-primary')}>
                      {cell => (
                        // Header positions are never labelled — the cell fills
                        // the slot directly (identity/title top-left).
                        <div class={styles.cardPrimary}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </div>
                      )}
                    </For>
                  </div>
                  <For each={inHeader('header-badge')}>
                    {cell => (
                      <div class={styles.cardBadge}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </div>
                    )}
                  </For>
                </div>
                {/* The secondary area — every cell with no explicit card region. When grouped:
                    each group is its own ROW (a .cardFields flow led by the group ICON),
                    skipping groups with nothing visible (pass 1); then a final row for cells in
                    NO group — ALL_TABS anchors + un-annotated columns — with no icon (pass 2).
                    Ungrouped tables render one flat row. A cell is "in a group" only via a real
                    tab key; ALL_TABS never counts as a card group. */}
                <Show when={secondaryCells().length > 0}>
                  {/* Pass 1 — one row per group. */}
                  <For each={props.tabsAndCardGroups}>
                    {group => {
                      const groupCells = () =>
                        secondaryCells().filter(c => cellInGroup(c, group.key));
                      return (
                        <Show when={groupCells().length > 0}>
                          <div class={styles.cardFields}>
                            <Show when={group.icon}>
                              {icon => (
                                <span class={styles.cardGroupIcon}>
                                  {icon()()}
                                </span>
                              )}
                            </Show>
                            <For each={groupCells()}>
                              {cell => (
                                <LabelledValue label={columnHeaderText(cell)}>
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </LabelledValue>
                              )}
                            </For>
                          </div>
                        </Show>
                      );
                    }}
                  </For>
                  {/* Pass 2 — the ungrouped row: cells in no real group (ALL_TABS anchors +
                      un-annotated), and the whole set when the table isn't grouped. No icon. */}
                  <Show
                    when={secondaryCells().filter(
                      c =>
                        !(props.tabsAndCardGroups ?? []).some(g =>
                          cellInGroup(c, g.key)
                        )
                    )}
                  >
                    {ungrouped => (
                      <Show when={ungrouped().length > 0}>
                        <div class={styles.cardFields}>
                          <For each={ungrouped()}>
                            {cell => (
                              <LabelledValue label={columnHeaderText(cell)}>
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </LabelledValue>
                            )}
                          </For>
                        </div>
                      </Show>
                    )}
                  </Show>
                </Show>
              </div>
            </td>
          </tr>
        );
      }}
    </For>
  );
}
