import { createMemo, createSignal, type JSX } from 'solid-js';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import type { FocusTarget } from '../../ui/utils/createFocusTarget';
import { Tabs, TabList, type TabDef } from '../../ui/elements/tabs/Tabs';
import { t } from '../../intl';
import { round } from '../../intl/formatNumber';
import { type LocationWithVolume } from './locationResource';
import {
  getVolumeUsedPercentage,
  visibleLocations,
  type Fullness,
} from './volume';
import styles from './LocationVolumeSelect.module.css';

export interface LocationVolumeSelectProps {
  /**
   * The locations WITH capacity, fetched by the parent route/view and passed
   * in (this widget owns no cache — volumeUsed is server-computed and goes
   * stale, so the parent re-reads it; see fetchLocationsWithVolume).
   */
  locations: LocationWithVolume[];
  /** True while the parent's fetch is in flight. */
  loading?: boolean;
  /** Selected location id (undefined = none). */
  value?: string;
  onChange: (location: LocationWithVolume | null) => void;
  /** Field label (required for a11y). */
  label: string;
  hideLabel?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  /** `data-testid` for the text input (locale-stable test hook, e2e/TESTIDS.md). */
  inputTestId?: string;
  /**
   * Control size, forwarded to the Combobox — `small` matches the compact
   * inputs a dense row (a line editor's batch card) puts beside it. Without
   * this the picker rendered at the default height next to `size="small"`
   * text fields, so the row's controls didn't line up.
   */
  size?: 'default' | 'small';
  /**
   * A `createFocusTarget()` handle bound to the picker's input — for an owner
   * that focuses it after an action (e.g. a dialog opening on it).
   */
  focusTarget?: FocusTarget;
  /**
   * The volume being placed (volumePerPack × packs). The "Available" filter
   * keeps only locations with room for it (and not on hold). Omit where no
   * specific volume applies — "Available" then means simply not-full.
   */
  requiredVolume?: number;
  /**
   * The location the stock being placed is **already in**, where that differs
   * from this field's own value — a repack's origin line, say. It always passes
   * the "Available" filter: its volumeUsed already counts the volume being
   * moved, so measuring that volume double-counts. Omit
   * where the field's value IS the current location (the line editors), or
   * where the stock isn't anywhere yet (new stock).
   */
  originalLocationId?: string;
  /**
   * Disable an option **in place**, labelled with the reason — return the
   * short reason text ("On hold", "Source location") for a disabled option,
   * undefined for an enabled one. Disabled-in-place beats filtering out where
   * the rule must stay visible (a stock movement's destination picker); the
   * fullness filter still narrows independently of it.
   */
  itemDisabledReason?: (l: LocationWithVolume) => string | undefined;
  /**
   * Offer the All / Empty / Available fullness filter inside the dropdown.
   * Default true — every stock-placing field wants it.
   *
   * Set false on a field that references a location **without placing stock in
   * it** (a sensor's assignment): the percentages still inform — which cold
   * room is in use — but "where will this fit" is not a question that field
   * asks, so the filter is noise there. The reference app draws the same line,
   * gating its filter on whether a volume is being placed
   * (spec/ui-standards/components.md → Location lookup (volume-aware)).
   */
  fullnessFilter?: boolean;
}

/*
 * The **volume-aware** Location picker, used everywhere stock is *placed* at a
 * location (stocktake / inbound line editors, bulk change-location). It differs
 * from the plain LocationSelect in two ways:
 *   1. Each option shows its "% used" (right-aligned, muted) — volumeUsed ÷
 *      volume, suppressed when that figure would be misleading (see volume.ts).
 *   2. A fullness filter (All / Empty / Available) offered as a tab strip
 *      pinned inside the dropdown — by default; `fullnessFilter={false}`
 *      suppresses it for a field that places no stock (a sensor's location).
 *      "Empty" keeps locations holding no stock; "Available" keeps those that
 *      are not on hold and have room for the volume being placed
 *      (requiredVolume — not-full when none is given).
 *      Two locations are exempt so the filter can never hide a valid choice:
 *      the currently-selected one (under every mode, so an already-placed line
 *      can be re-saved unchanged) and, under "Available", the one the stock is
 *      already in (originalLocationId) — see `passesFullness` in ./volume. The
 *      filter is advisory only — it narrows what's shown, never blocks a save.
 *
 * Both the code and the name are shown (and searched): options and the input
 * read "CODE — Name". Owns no cache: the parent fetches the volume-bearing list
 * and passes it in.
 */
export const LocationVolumeSelect = (
  props: LocationVolumeSelectProps
): JSX.Element => {
  const [fullness, setFullness] = createSignal<Fullness>('all');

  const showFullness = () => props.fullnessFilter ?? true;

  // The filter, its two exemptions and the suppression gate are all the pure
  // `visibleLocations` (./volume), so they can be unit-tested away from this
  // widget — each is invisible when wrong (a location merely goes missing).
  const filtered = createMemo<LocationWithVolume[]>(() =>
    visibleLocations(props.locations, fullness(), {
      selectedId: props.value,
      originalLocationId: props.originalLocationId,
      requiredVolume: props.requiredVolume,
      fullnessFilter: props.fullnessFilter,
    })
  );

  const percentUsedLabel = (l: LocationWithVolume): string => {
    const pct = getVolumeUsedPercentage(l);
    return pct === undefined
      ? ''
      : t('label.percent-used', { value: round(pct, 2) });
  };

  // The fullness filter as a tab strip, pinned inside the dropdown as its
  // listbox header — so it scopes the options in place. Keeps the contracted
  // `location-fullness-*` test ids (e2e/TESTIDS.md) rather than the auto
  // tab-<value> scheme.
  const fullnessTabs: TabDef[] = [
    { value: 'all', label: t('label.all'), testId: 'location-fullness-all' },
    {
      value: 'empty',
      label: t('label.empty'),
      testId: 'location-fullness-empty',
    },
    {
      value: 'available',
      label: t('label.available'),
      testId: 'location-fullness-available',
    },
  ];

  const filterHeader = (
    <Tabs value={fullness()} onValueChange={v => setFullness(v as Fullness)}>
      <TabList
        label={t('label.filter-locations-by-fullness')}
        tabs={fullnessTabs}
      />
    </Tabs>
  );

  return (
    <Combobox<LocationWithVolume>
      label={props.label}
      hideLabel={props.hideLabel}
      size={props.size}
      items={filtered()}
      loading={props.loading}
      itemToString={l => `${l.code} — ${l.name}`}
      itemToValue={l => l.id}
      value={props.value}
      disabled={props.disabled}
      error={props.error}
      placeholder={props.placeholder}
      inputTestId={props.inputTestId}
      focusTarget={props.focusTarget}
      onChange={l => props.onChange(l)}
      itemDisabled={
        props.itemDisabledReason
          ? l => props.itemDisabledReason!(l) !== undefined
          : undefined
      }
      // Let the popup grow past a narrow line-editor cell so a location's
      // code + name (and % used) stay readable rather than truncating to the
      // field width.
      matchTriggerWidth={false}
      listboxHeader={showFullness() ? filterHeader : undefined}
      renderItem={l => {
        const reason = props.itemDisabledReason?.(l);
        return (
          <span class={styles.option}>
            <span class={styles.optionLabel}>
              <span class={styles.code}>{l.code}</span>
              <span class={styles.name}>
                {l.name}
                {reason ? ` (${reason})` : ''}
              </span>
            </span>
            <span class={styles.percentUsed}>{percentUsedLabel(l)}</span>
          </span>
        );
      }}
    />
  );
};
