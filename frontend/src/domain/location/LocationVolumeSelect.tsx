import { createMemo, createSignal, type JSX } from 'solid-js';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { Tabs, TabList, type TabDef } from '../../ui/elements/tabs/Tabs';
import { t } from '../../intl';
import { round } from '../../intl/formatNumber';
import { type LocationWithVolume } from './locationResource';
import { getVolumeUsedPercentage, isAvailable, isEmpty } from './volume';
import styles from './LocationVolumeSelect.module.css';

// The three fullness-filter modes (spec/ui-standards/components.md → Location
// lookup — plain vs volume-aware), always offered as a tab strip in the dropdown.
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
  /** Field label (required for a11y). */
  label: string;
  hideLabel?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}

/*
 * The **volume-aware** Location picker, used everywhere stock is *placed* at a
 * location (stocktake / inbound line editors, bulk change-location). It differs
 * from the plain LocationSelect in two ways:
 *   1. Each option shows its "% used" (right-aligned, muted) — volumeUsed ÷
 *      volume, suppressed when that figure would be misleading (see volume.ts).
 *   2. A fullness filter (All / Empty / Available) is always offered as a tab
 *      strip pinned inside the dropdown. "Empty" keeps locations holding no
 *      stock; "Available" keeps those that are not on hold and not full. The
 *      currently-selected location ALWAYS passes so an already-placed line can
 *      be re-saved unchanged. The filter is advisory only — it narrows what's
 *      shown, it never blocks a save.
 *
 * Both the code and the name are shown (and searched): options and the input
 * read "CODE — Name". Owns no cache: the parent fetches the volume-bearing list
 * and passes it in.
 */
export const LocationVolumeSelect = (
  props: LocationVolumeSelectProps
): JSX.Element => {
  const [fullness, setFullness] = createSignal<Fullness>('all');

  const filtered = createMemo<LocationWithVolume[]>(() => {
    const mode = fullness();
    if (mode === 'all') return props.locations;
    const selectedId = props.value;
    return props.locations.filter(l => {
      // The already-selected location always survives the filter (so the line
      // can be re-saved unchanged even where it no longer "fits").
      if (l.id === selectedId) return true;
      return mode === 'empty' ? isEmpty(l) : isAvailable(l);
    });
  });

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
      items={filtered()}
      loading={props.loading}
      itemToString={l => `${l.code} — ${l.name}`}
      itemToValue={l => l.id}
      value={props.value}
      disabled={props.disabled}
      error={props.error}
      placeholder={props.placeholder}
      onChange={l => props.onChange(l)}
      // Let the popup grow past a narrow line-editor cell so a location's
      // code + name (and % used) stay readable rather than truncating to the
      // field width.
      matchTriggerWidth={false}
      listboxHeader={filterHeader}
      renderItem={l => (
        <span class={styles.option}>
          <span class={styles.optionLabel}>
            <span class={styles.code}>{l.code}</span>
            <span class={styles.name}>{l.name}</span>
          </span>
          <span class={styles.percentUsed}>{percentUsedLabel(l)}</span>
        </span>
      )}
    />
  );
};
