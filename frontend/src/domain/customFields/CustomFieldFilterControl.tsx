import { Match, Switch, type JSX } from 'solid-js';
import {
  FilterTextInput,
  FilterNumberInput,
  FilterSelect,
  FilterMultiSelect,
  FilterDate,
  NotChipEditor,
} from '../../ui/elements/selectors/FilterBar';
import { t } from '../../intl';
import {
  applyOptionToggle,
  type CustomFieldOption,
  type OrderedOption,
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
  // Typed reads of the current value for a given kind (null/other kind →
  // empty).
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
  const asMultiOptionIds = () =>
    props.value?.kind === 'multiOption' ? props.value.optionIds : [];
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
        {optionField => (
          <OptionSelectionFilter
            label={name()}
            testId={props.testId}
            options={optionField().def.options}
            ordered={optionField().options}
            values={asOptionIds()}
            onChange={optionIds =>
              props.onChange(
                optionIds.length ? { kind: 'option', optionIds } : null
              )
            }
          />
        )}
      </Match>

      <Match when={props.field.kind === 'multiOption' && props.field}>
        {multiField => (
          <OptionSelectionFilter
            label={name()}
            testId={props.testId}
            options={multiField().def.options}
            ordered={multiField().options}
            values={asMultiOptionIds()}
            onChange={optionIds =>
              props.onChange(
                optionIds.length ? { kind: 'multiOption', optionIds } : null
              )
            }
          />
        )}
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
// The OPTION-hierarchy selection filter, shared by the single-valued OPTION
// field and the multi-valued MULTI_OPTION one — the two ask the same question
// of the user ("which of these options?") and differ only in the condition
// they end up as, so they must not offer two different tick behaviours.
//
// Selection is a DIFF (parse › applyOptionToggle, shared with the editable
// MULTI_OPTION control): adding a node selects its whole subtree, removing one
// clears its subtree AND its ancestors, so ticking or unticking one option
// doesn't re-lock the rest. What the state holds is exactly what is ticked;
// widening it for the query is the condition builder's job (filter.ts).
const OptionSelectionFilter = (props: {
  label: string;
  testId?: string;
  options: CustomFieldOption[];
  ordered: OrderedOption[];
  values: string[];
  onChange: (optionIds: string[]) => void;
}) => {
  // Trigger summary: the TOP-MOST selected nodes (a selected node whose parent
  // is also selected is implied, so it isn't listed), capped so a large
  // selection stays "A, B, C +N more".
  const summary = () => {
    const set = new Set(props.values);
    const roots = props.ordered
      .filter(
        o =>
          set.has(o.option.id) &&
          (!o.option.parentOptionId || !set.has(o.option.parentOptionId))
      )
      .map(o => o.option.name);
    const CAP = 3;
    return roots.length <= CAP
      ? roots.join(', ')
      : `${roots.slice(0, CAP).join(', ')} ${t('custom-fields.filter-more', { count: roots.length - CAP })}`;
  };
  return (
    <FilterMultiSelect
      label={props.label}
      placeholder={t('label.any')}
      testId={props.testId}
      summary={summary}
      values={props.values}
      options={props.ordered.map(o => ({
        value: o.option.id,
        label: `${'  '.repeat(o.depth)}${o.option.name}`,
      }))}
      onChange={newIds =>
        props.onChange(applyOptionToggle(props.options, props.values, newIds))
      }
    />
  );
};

// Two controls side by side for a range (number min/max, date from/to).
//
// Both halves are FilterBar controls, so both would otherwise claim the chip's
// focus target and the LAST one mounted would win. `from` is where entry
// starts, so `to` renders in an empty focus scope (kdd/focus-targets). The
// slots are JSX props — getters, evaluated here — so `to`'s control really is
// constructed inside that scope.
const Range = (props: { from: JSX.Element; to: JSX.Element }) => (
  <span
    style={{ display: 'inline-flex', gap: '0.5rem', 'align-items': 'center' }}
  >
    {props.from}
    <span aria-hidden="true">–</span>
    <NotChipEditor>{props.to}</NotChipEditor>
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
