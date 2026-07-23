import { For, Show, createSignal } from 'solid-js';
import type { JSX } from 'solid-js';
import { t } from '../../../intl';
import { SaveIcon } from '../../icons';
import type { Density, TableConfig, TableConfigKey } from './tableConfig';
import styles from './TableSettings.module.css';

// The three density presets, in the spec's order (ui-standards § tables → row
// heights): comfortable is the ⭐ default, compact the dense power-user
// option, spacious the tablet/touch one.
const DENSITIES: Density[] = ['comfortable', 'compact', 'spacious'];
const densityLabel = (density: Density): string =>
  ({
    comfortable: t('table.density-comfortable'),
    compact: t('table.density-compact'),
    spacious: t('table.density-spacious'),
  })[density];

// The Settings panel — the content inside the toolbar's ⚙ popover: TABLE-WIDE
// settings, as opposed to the per-column rows of the Columns popover
// (ColumnSettings). Mirrors the spec's settings popover (ui-standards § tables,
// the advanced example's mrt-settings-pop): the Density radio group, then a
// divider, then the single "Reset table to default" (ONE reset restoring
// order, sizes, pinning, visibility AND density — no per-facet resets; kept
// VISIBLE but disabled while the layout is already at default, so it stays
// discoverable), plus the central-admin save-as-global-default.
export function TableSettings(props: {
  /** The resolved config (written via setConfig; density is read from the
   *  dedicated prop below, which includes the responsive default). */
  config?: TableConfig;
  /** The EFFECTIVE density the table is rendering — an explicit config
   *  choice, or the responsive default (spacious below the nav-overlay
   *  width). Shown checked in the radio. */
  density: Density;
  /** Write one config field (the controlled path DataTable already uses). */
  setConfig?: <K extends TableConfigKey>(key: K, value: TableConfig[K]) => void;
  /**
   * Reset the table to its default layout. The DataTable supplies this — it
   * clears every user-layer override for the current band via setConfig, so
   * resolution falls back to the global/default layers (NOT TanStack's
   * reset*, which would write TanStack's own empty state INTO the user layer
   * and shadow the page's defaults, e.g. its start-hidden columns).
   */
  onReset: () => void;
  /**
   * The layout already equals its default (no user overrides) — disables
   * Reset. Comes from the page's config controller (createTableConfig's
   * isConfigDefault), which owns the layers; when the page doesn't wire it,
   * Reset stays enabled (a no-op at default is harmless).
   */
  resetDisabled?: boolean;
  /**
   * Promote the current layout to the shared install-wide default. Present ONLY
   * when the host has decided the current user may do so (central server +
   * EDIT_CENTRAL_DATA — the gate is the host's, kept out of this generic
   * component); absent → the action isn't offered. Resolves true on success,
   * false on failure, which this panel reflects inline.
   */
  onSaveGlobalDefault?: () => Promise<boolean>;
}): JSX.Element {
  const density = (): Density => props.density;

  // Inline status for the save-as-global-default action (this app surfaces
  // feedback inline via Alert-style notices rather than a global toast). Reset
  // to idle when the panel is re-opened is unnecessary — the popover unmounts
  // its contents on close.
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
      {/* Density — one radio per preset, applied immediately via setConfig
          (persisted per band like the rest of the config). */}
      <div class={styles.sectionTitle}>{t('table.density')}</div>
      <div
        class={styles.densityGroup}
        role="radiogroup"
        aria-label={t('table.density')}
      >
        <For each={DENSITIES}>
          {option => (
            <label class={styles.densityOption}>
              <input
                type="radio"
                name="table-density"
                value={option}
                checked={density() === option}
                data-testid={`table-density-${option}`}
                onChange={() => props.setConfig?.('viewDensity', option)}
              />
              {densityLabel(option)}
            </label>
          )}
        </For>
      </div>

      <div class={styles.separator} />

      <button
        type="button"
        class={styles.action}
        disabled={props.resetDisabled}
        data-testid="table-reset-default"
        onClick={() => props.onReset()}
      >
        {t('table.reset-default')}
      </button>

      {/* Save-as-global-default — only for central-server admins (the host
          gates the callback's presence). Divider above sets it apart from the
          per-user settings: this writes the INSTALL-WIDE default, not local
          state. Feedback is inline (saving / saved / error) — no global
          toast. */}
      <Show when={props.onSaveGlobalDefault}>
        <div class={styles.saveDefault}>
          <button
            type="button"
            class={styles.action}
            disabled={saveStatus() === 'saving'}
            data-testid="table-save-global-default"
            onClick={saveGlobalDefault}
          >
            <SaveIcon class={styles.saveIcon} />
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
    </div>
  );
}
