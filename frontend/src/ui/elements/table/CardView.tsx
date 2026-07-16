import { For, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import {
  flexRender,
  type Cell as TanCell,
  type Table,
} from '@tanstack/solid-table';
import { LabelledValue } from '../typography/LabelledValue';
import { t } from '../../../intl';
import {
  membershipCardGroups,
  type Membership,
  type TabAndCardGroup,
} from './columnTypes';
import styles from './DataTable.module.css';

// A cell's explicit card region, or undefined when it has none — in which case
// it belongs to the single "secondary area" (rendered below the header, ordered
// by group when grouped).
const cellCardRegion = <T,>(
  cell: TanCell<T, unknown>
): 'primary' | 'badge' | undefined => cell.column.columnDef.meta?.card?.region;

// The column's header text, for a field label. Headers may be a string or
// JSX/function; only the string case yields a readable label (our columns use
// strings), else no label.
const columnHeaderText = <T,>(
  cell: TanCell<T, unknown>
): string | undefined => {
  const header = cell.column.columnDef.header;
  return typeof header === 'string' ? header : undefined;
};

// The optional caption for a primary/badge card cell — a small muted label
// above the cell (for an otherwise-unlabelled cell, e.g. an editable input).
// Opt in with `card.showLabel`; the text is the column's own header, so it
// isn't specified twice.
const cellCardLabel = <T,>(cell: TanCell<T, unknown>): string | undefined =>
  cell.column.columnDef.meta?.card?.showLabel
    ? columnHeaderText(cell)
    : undefined;

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
    <div class={styles.cardGrid}>
      <For each={rows()}>
        {row => {
          const cells = () => row.getVisibleCells();
          const inRegion = (region: 'primary' | 'badge') =>
            cells().filter(c => cellCardRegion(c) === region);
          // The "secondary area": every visible cell with NO explicit card
          // region.
          const secondaryCells = () =>
            cells().filter(c => cellCardRegion(c) === undefined);
          return (
            <div
              class={`${styles.card} ${props.onRowClick ? styles.rowClickable : ''}`}
              data-selected={row.getIsSelected() ? '' : undefined}
              onClick={() => props.onRowClick?.(row.original)}
            >
              <div class={styles.cardHeader}>
                <Show when={props.enableSelection}>
                  <input
                    type="checkbox"
                    class={styles.cardSelect}
                    aria-label={t('table.select-row')}
                    checked={row.getIsSelected()}
                    onChange={row.getToggleSelectedHandler()}
                    onClick={event => event.stopPropagation()}
                  />
                </Show>
                <div class={styles.cardIdentity}>
                  <For each={inRegion('primary')}>
                    {cell => (
                      // meta.card.label (optional): a muted caption above
                      // the cell, same style as a secondary field's label —
                      // for an unlabelled cell (e.g. an input).
                      <LabelledValue label={cellCardLabel(cell)}>
                        <div class={styles.cardPrimary}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </div>
                      </LabelledValue>
                    )}
                  </For>
                </div>
                <For each={inRegion('badge')}>
                  {cell => (
                    <LabelledValue label={cellCardLabel(cell)}>
                      <div class={styles.cardBadge}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </div>
                    </LabelledValue>
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
          );
        }}
      </For>
    </div>
  );
}
