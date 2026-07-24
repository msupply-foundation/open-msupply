import { For, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import type { Table } from '@tanstack/solid-table';
import { t } from '../../../intl';
import {
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  PinLeftIcon,
  PinRightIcon,
} from '../../icons';
import type { TableConfig, TableConfigKey, ViewMode } from './tableConfig';
import { ALL_TABS, type TabAndCardGroup } from './DataTable';
import styles from './ColumnSettings.module.css';

// The Columns panel (ui-standards § tables → column management, the advanced
// example's #mrt-cols-pop): Show all / Hide all, a Show | Move | Pin header,
// then a row per column — an eye / eye-off visibility toggle + name (the
// clickable label), with Move up/down and Pin left/right control groups
// trailing (column WIDTH is set by dragging the header edge, not here). It's a
// thin renderer over TanStack's own per-column getters/handlers (kdd/table-state
// — the brains are TanStack's; we only draw the UI): getIsVisible/getCanHide,
// getCanPin/getIsPinned/pin. Table-wide actions (density, Reset table to
// default, save-as-global-default) live in the separate Settings popover — see
// TableSettings.
//
// Writes go through setConfig (the same controlled path DataTable uses), so
// persistence + layering still apply.
export function ColumnSettings<T>(props: {
  table: Table<T>;
  setConfig?: <K extends TableConfigKey>(key: K, value: TableConfig[K]) => void;
  /**
   * The table's tabs/groups (when grouped) — used to badge each row with the
   * group(s) a
   *  column belongs to, so it's clear hiding/reordering is GLOBAL across tabs. */
  tabsAndCardGroups?: TabAndCardGroup<string>[];
  /**
   * The table's current view. The panel lists only the columns that view
   * actually shows — card-only columns (meta.hideOnTable) are dropped in table
   * view, table-only columns (meta.hideOnCard) in card view — so the popover
   * mirrors what's on screen (Carl 2026-07-24).
   */
  viewMode: ViewMode;
}): JSX.Element {
  // The tabs/groups a column id belongs to, for its settings-row icon badges.
  // An ALL_TABS column (batch, actions) belongs to EVERY tab → show all icons;
  // an array names specific groups → show those; absent → none.
  const columnGroups = (id: string): TabAndCardGroup<string>[] => {
    const groups = props.tabsAndCardGroups;
    if (!groups) return [];
    const membership = (
      props.table.getColumn(id)?.columnDef as {
        tabsAndCardGroups?: string[] | typeof ALL_TABS;
      }
    )?.tabsAndCardGroups;
    if (membership === ALL_TABS) return groups;
    if (!Array.isArray(membership)) return [];
    return groups.filter(g => membership.includes(g.key));
  };
  // Leaf column ids in effective display order (columnOrder if set, else def
  // order). Card-only / table-only columns are excluded for the current view
  // (see the viewMode prop) so the panel matches what's on screen.
  const listedIds = () =>
    props.table
      .getAllLeafColumns()
      .filter(c =>
        props.viewMode === 'card'
          ? !c.columnDef.meta?.hideOnCard
          : !c.columnDef.meta?.hideOnTable
      )
      .map(c => c.id);

  // Reorder by swapping two LISTED neighbours — but splice within the FULL
  // column order, so columns hidden in this view keep their slots (columnOrder
  // is one global list across both views and every tab).
  const move = (id: string, delta: -1 | 1) => {
    const listed = listedIds();
    const from = listed.indexOf(id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= listed.length) return;
    const full = props.table.getAllLeafColumns().map(c => c.id);
    const i = full.indexOf(id);
    const j = full.indexOf(listed[to]);
    if (i < 0 || j < 0) return;
    const next = [...full];
    [next[i], next[j]] = [next[j], next[i]];
    props.setConfig?.('columnOrder', next);
  };

  // Header text for the row label. TanStack headers can be a string or a
  // function/JSX; we only render the string case here (our columns use string
  // headers) and fall back to the column id otherwise, so the panel always has
  // a readable label.
  const label = (id: string) => {
    const header = props.table.getColumn(id)?.columnDef.header;
    return typeof header === 'string' ? header : id;
  };

  return (
    <div class={styles.panel}>
      {/* Bulk visibility — Show all / Hide all (ui-standards § tables → column
          management). TanStack's toggleAllColumnsVisible only touches columns
          that CAN hide (getCanHide), so structural columns are safe. */}
      <div class={styles.actions}>
        <button
          type="button"
          class={styles.action}
          data-testid="table-show-all-columns"
          onClick={() => props.table.toggleAllColumnsVisible(true)}
        >
          {t('table.show-all')}
        </button>
        <button
          type="button"
          class={styles.action}
          data-testid="table-hide-all-columns"
          onClick={() => props.table.toggleAllColumnsVisible(false)}
        >
          {t('table.hide-all')}
        </button>
      </div>

      {/* Muted column header labelling the row controls. */}
      <div class={styles.head} aria-hidden="true">
        <span class={styles.headShow}>{t('table.show')}</span>
        <span class={styles.headActions}>
          <span class={styles.headMove}>{t('table.move')}</span>
          <span class={styles.headPin}>{t('table.pin')}</span>
        </span>
      </div>

      <For each={listedIds()}>
        {(id, index) => {
          const column = () => props.table.getColumn(id)!;
          return (
            <div class={styles.row}>
              {/* Visibility — an eye / eye-off toggle. The checkbox is the
                  accessible control (visually hidden); clicking anywhere on the
                  label toggles it. Disabled when the column can't hide. */}
              <label class={styles.colLabel}>
                <input
                  type="checkbox"
                  class={styles.visInput}
                  checked={column().getIsVisible()}
                  disabled={!column().getCanHide()}
                  aria-label={t('table.column-visible')}
                  onChange={column().getToggleVisibilityHandler()}
                />
                <span class={styles.eye}>
                  <EyeIcon class={styles.eyeShow} />
                  <EyeOffIcon class={styles.eyeHide} />
                </span>
                <span class={styles.colName}>
                  {label(id)}
                  {/* Group badge(s): just the ICON of each group this column
                      belongs to (the group's label reads on its tab) — a compact
                      hint that visibility/order changes here are GLOBAL across
                      tabs. `title` gives the text on hover. */}
                  <For each={columnGroups(id)}>
                    {group => (
                      <Show when={group.icon}>
                        {icon => (
                          <span
                            class={styles.groupBadgeIcon}
                            title={t(group.labelKey)}
                          >
                            {icon()()}
                          </span>
                        )}
                      </Show>
                    )}
                  </For>
                </span>
              </label>

              {/* Trailing controls: Move up/down (no drag), then Pin L/R. */}
              <span class={styles.colActions}>
                <span class={styles.moveGroup}>
                  <button
                    type="button"
                    class={styles.moveBtn}
                    aria-label={t('table.move-up')}
                    disabled={index() === 0}
                    onClick={() => move(id, -1)}
                  >
                    <ChevronDownIcon class={styles.chevronUp} />
                  </button>
                  <button
                    type="button"
                    class={styles.moveBtn}
                    aria-label={t('table.move-down')}
                    disabled={index() === listedIds().length - 1}
                    onClick={() => move(id, 1)}
                  >
                    <ChevronDownIcon />
                  </button>
                </span>

                {/* Pin left / right — only when the column can be pinned. */}
                <Show when={column().getCanPin()}>
                  <span class={styles.pinGroup}>
                    <button
                      type="button"
                      class={`${styles.pinBtn} ${column().getIsPinned() === 'left' ? styles.pinActive : ''}`}
                      aria-label={t('table.pin-left')}
                      onClick={() =>
                        column().pin(
                          column().getIsPinned() === 'left' ? false : 'left'
                        )
                      }
                    >
                      <PinLeftIcon />
                    </button>
                    <button
                      type="button"
                      class={`${styles.pinBtn} ${column().getIsPinned() === 'right' ? styles.pinActive : ''}`}
                      aria-label={t('table.pin-right')}
                      onClick={() =>
                        column().pin(
                          column().getIsPinned() === 'right' ? false : 'right'
                        )
                      }
                    >
                      <PinRightIcon />
                    </button>
                  </span>
                </Show>
              </span>
            </div>
          );
        }}
      </For>
    </div>
  );
}
