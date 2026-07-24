import { Match, Switch, type JSX } from 'solid-js';
import {
  FilterTextInput,
  FilterNumberInput,
  FilterSelect,
  FilterMultiSelect,
  FilterDate,
} from '../../ui/elements/selectors/FilterBar';
import { t } from '../../intl';
import {
  ancestorIds,
  optionAndDescendantIds,
  type ParsedCustomField,
} from './parse';
import type { CustomFieldFilterValue } from './filter';

// The list-filter control for ONE custom field — the interpreter's filter
// surface: one Switch over the parsed `field.kind`, each arm a TYPED FilterBar
// control (spec/ui-standards/custom-fields › lists), so a boolean filters by
// Yes/No, an option by its options, a number/date by a range — never a bare
// text box for everything. Emits the typed `CustomFieldFilterValue` (or null to
// clear the chip). `unsupported` is never offered a filter (customFieldFilters
// drops it), so there is no arm for it.
export const CustomFieldFilterControl = (props: {
  field: ParsedCustomField;
  value: CustomFieldFilterValue | null;
  onChange: (value: CustomFieldFilterValue | null) => void;
  testId?: string;
}) => {
  // Typed reads of the current value for a given kind (null/other kind → empty).
  const asText = () =>
    props.value?.kind === 'text' ? props.value.contains : '';
  const asBoolean = (): 'true' | 'false' | '' =>
    props.value?.kind === 'boolean'
      ? props.value.value
        ? 'true'
        : 'false'
      : '';
  const asOptionIds = () =>
    props.value?.kind === 'option' ? props.value.optionIds : [];
  const asNumber = () =>
    props.value?.kind === 'number' ? props.value : undefined;
  const asDate = () => (props.value?.kind === 'date' ? props.value : undefined);

  const name = () => props.field.def.name;

  return (
    <Switch>
      <Match when={props.field.kind === 'text'}>
        <FilterTextInput
          label={name()}
          testId={props.testId}
          value={asText()}
          onInput={contains =>
            props.onChange(contains ? { kind: 'text', contains } : null)
          }
        />
      </Match>

      <Match when={props.field.kind === 'boolean'}>
        <FilterSelect
          label={name()}
          testId={props.testId}
          value={asBoolean()}
          options={[
            { value: '', label: '—' },
            { value: 'true', label: t('messages.yes') },
            { value: 'false', label: t('messages.no') },
          ]}
          onChange={v =>
            props.onChange(
              v === '' ? null : { kind: 'boolean', value: v === 'true' }
            )
          }
        />
      </Match>

      <Match when={props.field.kind === 'option' && props.field}>
        {optionField => {
          const opts = () => optionField().def.options;
          // Trigger summary: the TOP-MOST selected nodes (a selected node whose
          // parent is also selected is implied, so it isn't listed), capped so
          // a large selection stays "A, B, C +N more".
          const summary = () => {
            const set = new Set(asOptionIds());
            const roots = optionField()
              .options.filter(
                o =>
                  set.has(o.option.id) &&
                  (!o.option.parentOptionId ||
                    !set.has(o.option.parentOptionId))
              )
              .map(o => o.option.name);
            const CAP = 3;
            return roots.length <= CAP
              ? roots.join(', ')
              : `${roots.slice(0, CAP).join(', ')} ${t('custom-fields.filter-more', { count: roots.length - CAP })}`;
          };
          return (
            <FilterMultiSelect
              label={name()}
              placeholder={t('label.any')}
              testId={props.testId}
              summary={summary}
              values={asOptionIds()}
              options={optionField().options.map(o => ({
                value: o.option.id,
                label: `${'  '.repeat(o.depth)}${o.option.name}`,
              }))}
              onChange={newIds => {
                // Selection is a DIFF, so ticking/unticking one option doesn't
                // re-lock the rest: adding a node selects its whole subtree;
                // removing a node clears its subtree AND its ancestors (a parent
                // is only selected while every descendant is), keeping siblings.
                const prev = new Set(asOptionIds());
                const next = new Set<string>(newIds);
                for (const id of newIds.filter(i => !prev.has(i)))
                  for (const d of optionAndDescendantIds(opts(), id))
                    next.add(d);
                for (const id of [...prev].filter(i => !next.has(i))) {
                  for (const d of optionAndDescendantIds(opts(), id))
                    next.delete(d);
                  for (const a of ancestorIds(opts(), id)) next.delete(a);
                }
                const optionIds = [...next];
                props.onChange(
                  optionIds.length ? { kind: 'option', optionIds } : null
                );
              }}
            />
          );
        }}
      </Match>

      <Match when={props.field.kind === 'number'}>
        <Range
          from={
            <FilterNumberInput
              label={t('label.from')}
              placeholder={t('label.from')}
              value={asNumber()?.min}
              onChange={min =>
                props.onChange(
                  cleanRange({ kind: 'number', min, max: asNumber()?.max })
                )
              }
            />
          }
          to={
            <FilterNumberInput
              label={t('label.to')}
              placeholder={t('label.to')}
              value={asNumber()?.max}
              onChange={max =>
                props.onChange(
                  cleanRange({ kind: 'number', min: asNumber()?.min, max })
                )
              }
            />
          }
        />
      </Match>

      <Match when={props.field.kind === 'date'}>
        <Range
          from={
            <FilterDate
              label={t('label.from')}
              value={asDate()?.from ?? ''}
              onInput={from =>
                props.onChange(
                  cleanRange({ kind: 'date', from, to: asDate()?.to })
                )
              }
            />
          }
          to={
            <FilterDate
              label={t('label.to')}
              value={asDate()?.to ?? ''}
              onInput={to =>
                props.onChange(
                  cleanRange({ kind: 'date', from: asDate()?.from, to })
                )
              }
            />
          }
        />
      </Match>
    </Switch>
  );
};

// Two controls side by side for a range (number min/max, date from/to).
const Range = (props: { from: JSX.Element; to: JSX.Element }) => (
  <span
    style={{ display: 'inline-flex', gap: '0.5rem', 'align-items': 'center' }}
  >
    {props.from}
    <span aria-hidden="true">–</span>
    {props.to}
  </span>
);

// Drop a range whose bounds are both empty back to null (an empty chip).
const cleanRange = (
  v:
    | { kind: 'number'; min?: number; max?: number }
    | { kind: 'date'; from?: string; to?: string }
): CustomFieldFilterValue | null => {
  if (v.kind === 'number')
    return v.min === undefined && v.max === undefined ? null : v;
  const from = v.from || undefined;
  const to = v.to || undefined;
  return from === undefined && to === undefined
    ? null
    : { kind: 'date', from, to };
};
