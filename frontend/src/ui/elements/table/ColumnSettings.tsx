import { For, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import type { Table } from '@tanstack/solid-table';
import { t } from '../../../intl';
import { ChevronDownIcon } from '../../icons';
import { pxToRem } from '../../utils/rem';
import type { TableConfig, TableConfigKey } from './tableConfig';
import styles from './ColumnSettings.module.css';

// The column-settings panel: a table with a row per column, each exposing visibility,
// order (up/down), pin, and width (in rem). It's a thin renderer over TanStack's own
// per-column getters/handlers (kdd/table-state — the brains are TanStack's; we only draw
// the UI): getIsVisible/getCanHide, getCanPin/getIsPinned/pin, getSize/getCanResize. The
// three resets call table.reset*, which reverts to the resolved lower config layers.
//
// Writes go through setConfig (the same controlled path DataTable uses), so persistence +
// layering + the px↔rem boundary still apply. Sizes are shown/stored in REM (config truth);
// TanStack works in px, so we convert at this boundary too.
export function ColumnSettings<T>(props: {
  table: Table<T>;
  config?: TableConfig;
  setConfig?: <K extends TableConfigKey>(key: K, value: TableConfig[K]) => void;
}): JSX.Element {
  // Leaf columns in their current effective display order (columnOrder if set, else def
  // order). Reordering swaps a column with its neighbour in this id list.
  const orderedIds = () => props.table.getAllLeafColumns().map((c) => c.id);

  const move = (id: string, delta: -1 | 1) => {
    const ids = orderedIds();
    const from = ids.indexOf(id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= ids.length) return;
    const next = [...ids];
    [next[from], next[to]] = [next[to], next[from]];
    props.setConfig?.('columnOrder', next);
  };

  // Header text for the row label. TanStack headers can be a string or a function/JSX; we
  // only render the string case here (our columns use string headers) and fall back to the
  // column id otherwise, so the panel always has a readable label.
  const label = (id: string) => {
    const header = props.table.getColumn(id)?.columnDef.header;
    return typeof header === 'string' ? header : id;
  };

  // Current stored width in rem for a column, or undefined when unset (default width).
  const widthRem = (id: string): number | undefined => props.config?.columnSizing?.[id];

  const setWidthRem = (id: string, rem: number | undefined) => {
    const current = { ...(props.config?.columnSizing ?? {}) };
    if (rem == null) delete current[id];
    else current[id] = rem;
    props.setConfig?.('columnSizing', current);
  };

  return (
    <div class={styles.panel}>
      {/* Reset actions — each reverts one facet to the resolved config/default via TanStack. */}
      <div class={styles.actions}>
        <button type="button" class={styles.action} onClick={() => props.table.resetColumnVisibility()}>
          {t('table.reset-visibility')}
        </button>
        <button type="button" class={styles.action} onClick={() => props.table.resetColumnOrder()}>
          {t('table.reset-order')}
        </button>
        <button type="button" class={styles.action} onClick={() => props.table.resetColumnSizing()}>
          {t('table.reset-size')}
        </button>
      </div>

      <table class={styles.table}>
        <tbody>
          <For each={orderedIds()}>
            {(id, index) => {
              const column = () => props.table.getColumn(id)!;
              return (
                <tr class={styles.row}>
                  {/* Order: up/down chevrons (no drag). Disabled at the ends. */}
                  <td class={styles.orderCell}>
                    <button
                      type="button"
                      class={styles.iconButton}
                      aria-label={t('table.move-up')}
                      disabled={index() === 0}
                      onClick={() => move(id, -1)}
                    >
                      <ChevronDownIcon class={styles.chevronUp} />
                    </button>
                    <button
                      type="button"
                      class={styles.iconButton}
                      aria-label={t('table.move-down')}
                      disabled={index() === orderedIds().length - 1}
                      onClick={() => move(id, 1)}
                    >
                      <ChevronDownIcon />
                    </button>
                  </td>

                  {/* Visibility toggle — bound to TanStack; disabled when the column can't hide. */}
                  <td class={styles.visibilityCell}>
                    <input
                      type="checkbox"
                      checked={column().getIsVisible()}
                      disabled={!column().getCanHide()}
                      aria-label={t('table.column-visible')}
                      onChange={column().getToggleVisibilityHandler()}
                    />
                  </td>

                  <td class={styles.labelCell}>{label(id)}</td>

                  {/* Pin left / right — only when the column can be pinned. Active state shown. */}
                  <td class={styles.pinCell}>
                    <Show when={column().getCanPin()}>
                      <button
                        type="button"
                        class={`${styles.pinButton} ${column().getIsPinned() === 'left' ? styles.pinActive : ''}`}
                        aria-label={t('table.pin-left')}
                        onClick={() => column().pin(column().getIsPinned() === 'left' ? false : 'left')}
                      >
                        {t('table.pin-left-short')}
                      </button>
                      <button
                        type="button"
                        class={`${styles.pinButton} ${column().getIsPinned() === 'right' ? styles.pinActive : ''}`}
                        aria-label={t('table.pin-right')}
                        onClick={() => column().pin(column().getIsPinned() === 'right' ? false : 'right')}
                      >
                        {t('table.pin-right-short')}
                      </button>
                    </Show>
                  </td>

                  {/* Width in rem — shown only when a size is set; blank clears to default.
                      Placeholder shows the current effective width (getSize px → rem) so the
                      user sees what "default" is without it counting as an override. */}
                  <td class={styles.sizeCell}>
                    <Show when={column().getCanResize()}>
                      <input
                        type="number"
                        class={styles.sizeInput}
                        min="1"
                        step="0.5"
                        aria-label={t('table.column-width')}
                        value={widthRem(id) ?? ''}
                        placeholder={String(pxToRem(column().getSize()))}
                        onChange={(event) => {
                          const raw = event.currentTarget.value.trim();
                          if (raw === '') return setWidthRem(id, undefined);
                          const rem = Number.parseFloat(raw);
                          setWidthRem(id, Number.isNaN(rem) ? undefined : rem);
                        }}
                      />
                      <span class={styles.remUnit}>{t('table.rem')}</span>
                    </Show>
                  </td>
                </tr>
              );
            }}
          </For>
        </tbody>
      </table>
    </div>
  );
}
