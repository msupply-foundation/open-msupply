import { t } from '@/intl';
import {
  FilterCheckbox,
  FilterDateTime,
  FilterSelect,
  FilterTextInput,
  constructFilters,
  type Filter,
} from '@/ui/elements/selectors/FilterBar';
import { breachTypeLabelKey } from './breachDisplay';
import {
  OFFERED_BREACH_TYPES,
  type BreachType,
  type MonitoringFilter,
} from './monitoringState';

/*
 * Type-driven, EXHAUSTIVE filter definitions for the monitoring screen's ONE
 * shared filter set (ui-surface S1 § filters), in the surface's own order. The
 * map is keyed by EVERY member of MonitoringFilter, so adding a fact to the
 * filter vocabulary stops this compiling until it is exposed or dismissed
 * (the reference vertical's pattern).
 *
 * The filter bar is the whole filter surface: there is deliberately no
 * end-date filter here or anywhere (an end bound silently drops every ongoing
 * breach — contract ⚠️ wire trap), and the breach-type list omits Excursion
 * (never a stored breach).
 *
 * Built once at module load: a stable const, so FilterBar's <For> never
 * remounts a chip on a filter edit (kdd/solid-reactivity-pitfalls § no
 * remounts). Labels are ACCESSORS read in FilterBar's JSX, so they
 * re-translate on a language switch without rebuilding the array.
 */
const FILTERS: Filter<MonitoringFilter>[] = constructFilters<MonitoringFilter>({
  sensorName: {
    label: () => t('label.sensor-name'),
    render: props => (
      <FilterTextInput
        label={t('label.sensor-name')}
        testId={props.testId}
        placeholder={t('placeholder.search')}
        value={props.filter().sensorName ?? ''}
        // Substring on the sensor's name. Blank box → null, never an empty
        // `like`, which would wrongly match everything.
        onInput={value => props.setPartialFilter({ sensorName: value || null })}
      />
    ),
  },
  locationCode: {
    label: () => t('label.location'),
    render: props => (
      <FilterTextInput
        label={t('label.location')}
        testId={props.testId}
        // The surface names this placeholder (ui-surface S1 § filters): the
        // match is against the location's CODE, which the label alone does
        // not say.
        placeholder={t('placeholder.search-by-location-code')}
        value={props.filter().locationCode ?? ''}
        onInput={value =>
          props.setPartialFilter({ locationCode: value || null })
        }
      />
    ),
  },
  // The two bounds are two chips, each removable on its own, each a single
  // date-time. On the bar from arrival (monitoringState › DEFAULT_STATE).
  fromStart: {
    label: () => t('label.from-start-datetime'),
    render: props => (
      <FilterDateTime
        label={t('label.from-start-datetime')}
        testId={props.testId}
        value={props.filter().fromStart ?? null}
        onChange={value => props.setPartialFilter({ fromStart: value })}
      />
    ),
  },
  toStart: {
    label: () => t('label.to-start-datetime'),
    render: props => (
      <FilterDateTime
        label={t('label.to-start-datetime')}
        testId={props.testId}
        value={props.filter().toStart ?? null}
        onChange={value => props.setPartialFilter({ toStart: value })}
      />
    ),
  },
  breachType: {
    label: () => t('label.breach-type'),
    render: props => (
      <FilterSelect<BreachType>
        label={t('label.breach-type')}
        testId={props.testId}
        value={props.filter().breachType ?? ''}
        options={[
          { value: '', label: t('label.all') },
          ...OFFERED_BREACH_TYPES.map(type => ({
            value: type,
            label: t(breachTypeLabelKey(type)),
          })),
        ]}
        // Exactly one kind, or none — the empty choice clears the filter
        // rather than sending `{ equalTo: '' }`.
        onChange={value =>
          props.setPartialFilter({ breachType: value || null })
        }
      />
    ),
  },
  // The boolean chip: ticked narrows to unacknowledged breaches; unticked
  // lists both (never an acknowledged-only list). On the bar from arrival.
  unacknowledged: {
    label: () => t('label.unacknowledged'),
    render: props => (
      <FilterCheckbox
        label={t('label.unacknowledged')}
        testId={props.testId}
        checked={props.filter().unacknowledged === true}
        onChange={checked =>
          props.setPartialFilter({ unacknowledged: checked ? true : null })
        }
      />
    ),
  },
});

export const filterFields = (): Filter<MonitoringFilter>[] => FILTERS;
