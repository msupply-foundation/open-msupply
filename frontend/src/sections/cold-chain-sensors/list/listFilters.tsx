import { t } from '@/intl';
import {
  FilterSelect,
  FilterTextInput,
  constructFilters,
  type Filter,
} from '@/ui/elements/selectors/FilterBar';
import { SENSOR_TYPES, sensorTypeLabelKey } from './sensorDisplay';
import type { SensorType } from './sensorDisplay';
import type { SensorUserFilter } from './listState';

/*
 * Type-driven, EXHAUSTIVE filter definitions for the sensor list
 * (ui-surface S1 § filters): Serial number and Location as text-contains,
 * Sensor type as a single choice. The map is keyed by EVERY user-settable key
 * of the generated SensorFilterInput — a key maps to a definition to expose it,
 * or `null` to dismiss it — so when the schema gains a filter, codegen adds the
 * key and this map stops compiling until we decide expose-or-dismiss (the
 * reference vertical's pattern).
 *
 * Anchors: spec/cold-chain-sensors/cases/OMS-REG-CCE-03 — `.n` below.
 *
 * Built once at module load: a stable const, so FilterBar's <For> never
 * remounts a chip on a filter edit (kdd/solid-reactivity-pitfalls § no
 * remounts). Labels are ACCESSORS read in FilterBar's JSX, so they
 * re-translate on a language switch without rebuilding the array.
 */
const FILTERS: Filter<SensorUserFilter>[] = constructFilters<SensorUserFilter>({
  // ─ user-facing, in display order ─────────────────────────────────────────
  serial: {
    label: () => t('label.serial'),
    render: props => (
      <FilterTextInput
        label={t('label.serial')}
        testId={props.testId}
        placeholder={t('placeholder.search')}
        value={props.filter().serial?.like ?? ''}
        // `like`, never `equalTo`: the filter matches the STORED serial, which
        // still carries the manufacturer the screen strips, so an exact match
        // on the serial as displayed finds nothing (contract ⚠️ wire trap,
        // .17). Blank box → null, never { like: '' } — an empty
        // `like` would wrongly match everything.
        onInput={value =>
          props.setPartialFilter({ serial: value ? { like: value } : null })
        }
      />
    ),
  },
  locationCode: {
    label: () => t('label.location'),
    render: props => (
      <FilterTextInput
        label={t('label.location')}
        testId={props.testId}
        placeholder={t('placeholder.search')}
        // Matches the location's CODE, which is also what the Location column
        // shows (.16).
        value={props.filter().locationCode?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({
            locationCode: value ? { like: value } : null,
          })
        }
      />
    ),
  },
  type: {
    label: () => t('label.sensor-type'),
    render: props => (
      <FilterSelect<SensorType>
        label={t('label.sensor-type')}
        testId={props.testId}
        value={props.filter().type?.equalTo ?? ''}
        options={[
          { value: '', label: t('label.all') },
          ...SENSOR_TYPES.map(type => ({
            value: type,
            label: t(sensorTypeLabelKey(type)),
          })),
        ]}
        // Exactly one kind, or none — the empty choice clears the filter rather
        // than sending `{ equalTo: '' }` (.15).
        onChange={value =>
          props.setPartialFilter({ type: value ? { equalTo: value } : null })
        }
      />
    ),
  },

  // ─ dismissed (not user-facing) ───────────────────────────────────────────
  // The list read honours a name filter, but the screen offers no control that
  // sets one — captured as-is from the current app (rules › reading the list).
  // Dismissed here rather than exposed, so the built screen matches the one the
  // spec describes.
  name: null,
});

export const filterFields = (): Filter<SensorUserFilter>[] => FILTERS;
