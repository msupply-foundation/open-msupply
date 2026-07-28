import { Show, createSignal } from 'solid-js';
import type { JSX } from 'solid-js';
import type { Table } from '@tanstack/solid-table';
import { t } from '../../../intl';
import {
  EyeIcon,
  MenuLinesIcon,
  PinIcon,
  RefreshIcon,
  ReloadIcon,
  SaveIcon,
  TransferHorizontalIcon,
} from '../../icons';
import type { Density, TableConfig, TableConfigKey } from './tableConfig';
import styles from './TableSettings.module.css';

// The density cycle for the "Toggle density" action (issue #572), matching the
// current app's order: compact → spacious → comfortable → compact.
const DENSITY_CYCLE: Density[] = ['compact', 'spacious', 'comfortable'];

// The Settings panel — the content inside the toolbar's ⚙ popover: TABLE-WIDE
// settings, as opposed to the per-column rows of the Columns popover
// (ColumnSettings). Matches the current app's settings menu (issue #572): the
// granular resets (order / visibility / sizes / pinning), a "Toggle density"
// cycle, the optional central-admin save-as-global-default, and finally the
// destructive (red) "Reset table to defaults" that clears ALL overrides at once
// — kept visible but disabled while the layout is already at default.
//
// Writes go through setConfig (the same controlled path DataTable uses); a
// per-facet reset writes `undefined` for that key so resolution falls back to
// the global/default layers (NOT TanStack's reset*, which would write empty
// state INTO the user layer and shadow the page's defaults).
export function TableSettings<T>(props: {
  table: Table<T>;
  /** The resolved config (density is read from the dedicated prop below, which
   *  includes the responsive default). */
  config?: TableConfig;
  /** The EFFECTIVE density the table is rendering — an explicit config choice,
   *  or the responsive default. Drives the density cycle's next value. */
  density: Density;
  /** Write one config field (the controlled path DataTable already uses). */
  setConfig?: <K extends TableConfigKey>(key: K, value: TableConfig[K]) => void;
  /**
   * Reset the WHOLE table to its default layout — clears every user-layer
   * override for the current band (order, sizes, pinning, visibility, density).
   * Supplied by DataTable.
   */
  onReset: () => void;
  /**
   * The layout already equals its default (no user overrides) — disables the
   * whole-table Reset. From the page's config controller.
   */
  resetDisabled?: boolean;
  /**
   * Per-facet applicability (issue #572): each granular reset is disabled unless
   * that facet actually differs from the default — e.g. Reset column order is
   * offered only once the columns have been reordered. Supplied by DataTable
   * (derived from the resolved config); undefined leaves the action enabled.
   */
  orderChanged?: boolean;
  anyColumnHidden?: boolean;
  anyColumnSized?: boolean;
  anyColumnPinned?: boolean;
  /**
   * Promote the current layout to the shared install-wide default. Present ONLY
   * when the host allows it (central server + EDIT_CENTRAL_DATA); absent → the
   * action isn't offered. Resolves true on success, false on failure.
   */
  onSaveGlobalDefault?: () => Promise<boolean>;
}): JSX.Element {
  // Cycle the density (issue #572 — one "Toggle density" action, not a radio).
  const toggleDensity = () => {
    const i = DENSITY_CYCLE.indexOf(props.density);
    const next = DENSITY_CYCLE[(i + 1) % DENSITY_CYCLE.length] ?? 'comfortable';
    props.setConfig?.('viewDensity', next);
  };

  // Show every hideable column (issue #572). Sets each getCanHide() column
  // visible; structural columns (can't hide) are already visible, so untouched.
  const showAllColumns = () => {
    const next = { ...props.table.getState().columnVisibility };
    for (const column of props.table.getAllLeafColumns()) {
      if (column.getCanHide()) next[column.id] = true;
    }
    props.setConfig?.('columnVisibility', next);
  };

  // Inline status for the save-as-global-default action (this app surfaces
  // feedback inline rather than via a global toast).
  const [saveStatus, setSaveStatus] = createSignal<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const saveGlobalDefault = async () => {
    setSaveStatus('saving');
    const ok = await props.onSaveGlobalDefault?.();
    setSaveStatus(ok ? 'saved' : 'error');
  };

  return (
    <div class={styles.panel}>
      {/* Panel heading (issue #572 — matches the current app's settings menu). */}
      <div class={styles.title}>{t('table.settings')}</div>
      <div class={styles.separator} />

      {/* Granular resets — each clears one facet's user override (order /
          visibility / sizes / pinning). */}
      <button
        type="button"
        class={styles.popBtn}
        disabled={!props.orderChanged}
        data-testid="table-reset-column-order"
        onClick={() => props.setConfig?.('columnOrder', undefined)}
      >
        <TransferHorizontalIcon class={styles.itemIcon} />
        {t('label.reset-column-order')}
      </button>
      <button
        type="button"
        class={styles.popBtn}
        disabled={!props.anyColumnHidden}
        data-testid="table-show-all-columns-setting"
        onClick={showAllColumns}
      >
        <EyeIcon class={styles.itemIcon} />
        {t('label.show-all-columns')}
      </button>
      <button
        type="button"
        class={styles.popBtn}
        disabled={!props.anyColumnSized}
        data-testid="table-reset-column-sizes"
        onClick={() => props.setConfig?.('columnSizing', undefined)}
      >
        <ReloadIcon class={styles.itemIcon} />
        {t('label.reset-column-sizes')}
      </button>
      <button
        type="button"
        class={styles.popBtn}
        disabled={!props.anyColumnPinned}
        data-testid="table-reset-pinned-columns"
        onClick={() => props.setConfig?.('columnPinning', undefined)}
      >
        <PinIcon class={styles.itemIcon} />
        {t('label.reset-pinned-columns')}
      </button>

      <div class={styles.separator} />

      {/* Toggle density — cycles compact → spacious → comfortable. */}
      <button
        type="button"
        class={styles.popBtn}
        data-testid="table-toggle-density"
        onClick={toggleDensity}
      >
        <MenuLinesIcon class={styles.itemIcon} />
        {t('label.toggle-density')}
      </button>

      {/* Save-as-global-default — central-server admins only (the host gates the
          callback's presence). Own block + divider; feedback is inline. */}
      <Show when={props.onSaveGlobalDefault}>
        <div class={styles.saveDefault}>
          <button
            type="button"
            class={styles.popBtn}
            disabled={saveStatus() === 'saving'}
            data-testid="table-save-global-default"
            onClick={saveGlobalDefault}
          >
            <SaveIcon class={styles.itemIcon} />
            {t('table.save-global-default')}
          </button>
          <Show when={saveStatus() !== 'idle'}>
            <span
              class={styles.saveStatus}
              data-status={saveStatus()}
              role="status"
            >
              {saveStatus() === 'saving' &&
                t('table.save-global-default.saving')}
              {saveStatus() === 'saved' && t('table.save-global-default.saved')}
              {saveStatus() === 'error' && t('table.save-global-default.error')}
            </span>
          </Show>
        </div>
      </Show>

      <div class={styles.separator} />

      {/* Destructive whole-table reset (red). Visible but disabled while the
          layout is already at default, so it stays discoverable. */}
      <button
        type="button"
        class={`${styles.popBtn} ${styles.reset}`}
        disabled={props.resetDisabled}
        data-testid="table-reset-default"
        onClick={() => props.onReset()}
      >
        <RefreshIcon class={styles.itemIcon} />
        {t('label.reset-table-defaults')}
      </button>
    </div>
  );
}
