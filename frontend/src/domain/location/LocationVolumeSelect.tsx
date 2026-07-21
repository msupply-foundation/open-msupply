import { createMemo, createSignal, Show, type JSX } from 'solid-js';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { RadioGroup } from '../../ui/elements/inputs/RadioGroup';
import { t } from '../../intl';
import { round } from '../../intl/formatNumber';
import { type LocationWithVolume } from './locationResource';
import { availableVolume, getVolumeUsedPercentage } from './volume';
import styles from './LocationVolumeSelect.module.css';

// The three fullness-filter modes (spec/ui-standards/components.md → Location
// lookup — plain vs volume-aware). Shown only when a required volume is given.
type Fullness = 'all' | 'empty' | 'available';

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
  /**
   * The volume the stock being placed will occupy (`volumePerPack ×
   * countedNumberOfPacks` for one line, the sum over a selection for the bulk
   * action). Its presence turns on the fullness filter — the "Available" mode
   * keeps locations whose free space covers it. Omit for no filter.
   */
  volumeRequired?: number;
  /** Field label (required for a11y). */
  label: string;
  hideLabel?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}

/*
 * The **volume-aware** Location picker, used where stock is *associated* with a
 * location (stocktake line editor, bulk change-location). It differs from the
 * plain LocationSelect in two ways, both from the current app's
 * LocationSearchInput:
 *   1. Each option shows its "% used" (right-aligned, muted) — volumeUsed ÷
 *      volume, suppressed when that figure would be misleading (see volume.ts).
 *   2. When `volumeRequired` is given, a fullness filter (All / Empty /
 *      Available) narrows the list. "Available" = free space ≥ required; the
 *      currently-selected location ALWAYS passes so an already-placed line can
 *      be re-saved unchanged. The filter is advisory only — it never blocks a
 *      save (spec/stocktakes/rules.md, AC-VL3), it just guides the choice.
 *
 * Owns no cache: the parent fetches the volume-bearing list and passes it in.
 */
export const LocationVolumeSelect = (
  props: LocationVolumeSelectProps
): JSX.Element => {
  const [fullness, setFullness] = createSignal<Fullness>('all');

  const hasFilter = () => typeof props.volumeRequired === 'number';

  const filtered = createMemo<LocationWithVolume[]>(() => {
    if (!hasFilter() || fullness() === 'all') return props.locations;
    const required = props.volumeRequired ?? 0;
    const selectedId = props.value;
    return props.locations.filter(l => {
      // The already-selected location always survives the filter (so the line
      // can be re-saved unchanged even where it no longer "fits").
      if (l.id === selectedId) return true;
      return fullness() === 'empty'
        ? l.stock.totalCount === 0
        : availableVolume(l) >= required;
    });
  });

  const percentUsedLabel = (l: LocationWithVolume): string => {
    const pct = getVolumeUsedPercentage(l);
    return pct === undefined
      ? ''
      : t('label.percent-used', { value: round(pct, 2) });
  };

  // The fullness filter, pinned inside the dropdown as its listbox header (only
  // when a required volume enables it) — so it scopes the options in place,
  // rather than sitting outside the field.
  const filterHeader = () => (
    <Show when={hasFilter()}>
      <RadioGroup
        label={t('label.filter-locations-by-fullness')}
        orientation="horizontal"
        value={fullness()}
        onChange={v => setFullness(v as Fullness)}
        options={[
          { value: 'all', label: t('label.all') },
          { value: 'empty', label: t('label.empty') },
          { value: 'available', label: t('label.available') },
        ]}
      />
    </Show>
  );

  return (
    <Combobox<LocationWithVolume>
      label={props.label}
      hideLabel={props.hideLabel}
      items={filtered()}
      loading={props.loading}
      itemToString={l => l.code}
      itemToValue={l => l.id}
      value={props.value}
      disabled={props.disabled}
      error={props.error}
      placeholder={props.placeholder}
      onChange={l => props.onChange(l)}
      listboxHeader={hasFilter() ? filterHeader() : undefined}
      renderItem={l => (
        <span class={styles.option}>
          <span class={styles.optionLabel}>{l.code}</span>
          <span class={styles.percentUsed}>{percentUsedLabel(l)}</span>
        </span>
      )}
    />
  );
};
