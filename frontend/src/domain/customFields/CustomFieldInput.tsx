import { Match, Switch } from 'solid-js';
import { Checkbox } from '../../ui/elements/inputs/Checkbox';
import { TextField } from '../../ui/elements/inputs/TextField';
import { NumberField } from '../../ui/elements/inputs/NumberField';
import { DateField } from '../../ui/elements/inputs/DateField';
import { CustomFieldOptionSelect } from './CustomFieldOptionSelect';
import type { CustomFieldDef } from './customFields';

// A number-typed stored value coerced back to a number for the NumberField;
// undefined (empty field) for anything non-numeric.
const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return value;
  if (value == null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

// The single editable value-type → control mapping (spec/ui-standards/
// custom-fields › value types), used by both the editable tab and the prominent
// toolbar. `value` is the field's raw stored value; `onChange` emits the new
// value to store (a number for numeric types, a boolean, an ISO date string or
// null, or the option id — `undefined` when cleared). The label is carried by
// the surrounding row/label, so it is hidden here.
export const CustomFieldInput = (props: {
  def: CustomFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  testId?: string;
}) => {
  const testId = () => props.testId ?? `custom-field-${props.def.key}`;
  return (
    <Switch
      fallback={
        <TextField
          label={props.def.name}
          hideLabel
          width="full"
          value={props.value == null ? '' : String(props.value)}
          disabled={props.disabled}
          data-testid={testId()}
          onInput={e => props.onChange(e.currentTarget.value)}
        />
      }
    >
      <Match when={props.def.valueType === 'BOOLEAN'}>
        <Checkbox
          label={props.def.name}
          checked={Boolean(props.value)}
          disabled={props.disabled}
          testId={testId()}
          onChange={checked => props.onChange(checked)}
        />
      </Match>
      <Match
        when={
          props.def.valueType === 'INTEGER' || props.def.valueType === 'REAL'
        }
      >
        <NumberField
          label={props.def.name}
          hideLabel
          width="full"
          allowNegative
          decimalLimit={props.def.valueType === 'REAL' ? 6 : 0}
          value={asNumber(props.value)}
          disabled={props.disabled}
          onChange={n => props.onChange(n)}
        />
      </Match>
      <Match when={props.def.valueType === 'DATE'}>
        <DateField
          label={props.def.name}
          hideLabel
          width="full"
          value={typeof props.value === 'string' ? props.value : null}
          disabled={props.disabled}
          onChange={d => props.onChange(d)}
        />
      </Match>
      <Match when={props.def.valueType === 'OPTION'}>
        <CustomFieldOptionSelect
          def={props.def}
          value={props.value == null ? '' : String(props.value)}
          disabled={props.disabled}
          testId={testId()}
          onChange={id => props.onChange(id || undefined)}
        />
      </Match>
    </Switch>
  );
};
