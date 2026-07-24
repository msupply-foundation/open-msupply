import { Match, Switch } from 'solid-js';
import { Checkbox } from '../../ui/elements/inputs/Checkbox';
import { TextField } from '../../ui/elements/inputs/TextField';
import { NumberField } from '../../ui/elements/inputs/NumberField';
import { DateField } from '../../ui/elements/inputs/DateField';
import { t } from '../../intl';
import { CustomFieldOptionSelect } from './CustomFieldOptionSelect';
import type { ParsedCustomField } from './parse';

// A number-typed stored value coerced back to a number for the NumberField;
// undefined (empty) for anything non-numeric.
const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return value;
  if (value == null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

// The editable control for ONE custom field — the interpreter's edit surface:
// a single Switch over the parsed `field.kind`, each arm an explicit library
// component (kdd/explicit-composition, kdd/report-argument-forms). An
// `unsupported` kind (a value type a newer server added) degrades to a disabled
// placeholder in the fallback, never crashes. `value` is the field's raw stored
// value; `onChange` emits the new value to store — a boolean, a number
// (undefined when cleared), an ISO date string or null, the option id, or text.
//
// By default the control shows its own label ABOVE it — the sectioned-edit-form
// row used in the custom-fields tab (matches the patient/stock detail forms).
// Pass `hideLabel` where a surrounding row supplies the label (the toolbar's
// FieldRow); a boolean always renders its labelled checkbox inline.
export const CustomFieldInput = (props: {
  field: ParsedCustomField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  hideLabel?: boolean;
  size?: 'default' | 'small';
  testId?: string;
}) => {
  const testId = () => props.testId ?? `custom-field-${props.field.def.key}`;
  const name = () => props.field.def.name;
  return (
    <Switch
      fallback={
        // unsupported: labelled but disabled, so the row still renders.
        <TextField
          label={name()}
          hideLabel={props.hideLabel}
          size={props.size}
          width="full"
          disabled
          value=""
          helperText={t('custom-fields.unsupported-type')}
        />
      }
    >
      <Match when={props.field.kind === 'boolean'}>
        <Checkbox
          label={name()}
          checked={Boolean(props.value)}
          disabled={props.disabled}
          testId={testId()}
          onChange={checked => props.onChange(checked)}
        />
      </Match>
      <Match when={props.field.kind === 'text'}>
        <TextField
          label={name()}
          hideLabel={props.hideLabel}
          size={props.size}
          width="full"
          value={props.value == null ? '' : String(props.value)}
          disabled={props.disabled}
          data-testid={testId()}
          onInput={e => props.onChange(e.currentTarget.value)}
        />
      </Match>
      <Match when={props.field.kind === 'number' && props.field}>
        {numberField => (
          <NumberField
            label={name()}
            hideLabel={props.hideLabel}
            size={props.size}
            width="full"
            allowNegative
            decimalLimit={numberField().integer ? 0 : 6}
            value={asNumber(props.value)}
            disabled={props.disabled}
            onChange={n => props.onChange(n)}
          />
        )}
      </Match>
      <Match when={props.field.kind === 'date'}>
        <DateField
          label={name()}
          hideLabel={props.hideLabel}
          size={props.size}
          width="full"
          value={typeof props.value === 'string' ? props.value : null}
          disabled={props.disabled}
          onChange={d => props.onChange(d)}
        />
      </Match>
      <Match when={props.field.kind === 'option' && props.field}>
        {optionField => (
          <CustomFieldOptionSelect
            def={optionField().def}
            value={props.value == null ? '' : String(props.value)}
            disabled={props.disabled}
            hideLabel={props.hideLabel}
            testId={testId()}
            onChange={id => props.onChange(id || undefined)}
          />
        )}
      </Match>
    </Switch>
  );
};
