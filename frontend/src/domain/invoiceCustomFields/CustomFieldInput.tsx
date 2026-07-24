import { Match, Switch, type JSX } from 'solid-js';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { ToggleSwitch } from '../../ui/elements/inputs/ToggleSwitch';
import { TextField } from '../../ui/elements/inputs/TextField';
import { NumberField } from '../../ui/elements/inputs/NumberField';
import { DateField } from '../../ui/elements/inputs/DateField';
import type { CustomFieldDefinition } from './invoiceCustomFieldsResource';

// One control for one invoice custom-field value (spec/prescriptions § custom
// fields; AC-CF2): the value type picks the control. Shared by the detail
// toolbar (prominent fields) and the Custom fields tab (visible fields). The
// stored value is the raw JSON scalar — an OPTION stores the chosen option's
// id, BOOLEAN a boolean, the rest their natural scalar.

export interface CustomFieldInputProps {
  definition: CustomFieldDefinition;
  /** Current value from the invoice's customFields blob. */
  value: unknown;
  disabled?: boolean;
  /** Fires the new value (null clears the key). */
  onChange: (value: unknown) => void;
  hideLabel?: boolean;
}

type OptionRow = { id: string; name: string };

export const CustomFieldInput = (props: CustomFieldInputProps): JSX.Element => {
  const label = () => props.definition.name || props.definition.key;
  const asString = () =>
    typeof props.value === 'string' ? props.value : undefined;
  const asNumber = () =>
    typeof props.value === 'number' ? props.value : undefined;

  return (
    <Switch
      fallback={
        <TextField
          label={label()}
          hideLabel={props.hideLabel}
          value={asString() ?? ''}
          disabled={props.disabled}
          onChange={value => props.onChange(value || null)}
        />
      }
    >
      <Match when={props.definition.valueType === 'OPTION'}>
        <Combobox<OptionRow>
          label={label()}
          hideLabel={props.hideLabel}
          // Options may be hierarchical (parentOptionId) — rendered flat here;
          // the stored value is the chosen option's id.
          items={props.definition.options.map(o => ({
            id: o.id,
            name: o.name,
          }))}
          itemToString={o => o.name}
          itemToValue={o => o.id}
          value={asString()}
          disabled={props.disabled}
          clearable
          onChange={o => props.onChange(o?.id ?? null)}
        />
      </Match>
      <Match when={props.definition.valueType === 'BOOLEAN'}>
        <ToggleSwitch
          label={label()}
          checked={Boolean(props.value)}
          disabled={props.disabled}
          onChange={checked => props.onChange(checked)}
        />
      </Match>
      <Match
        when={
          props.definition.valueType === 'INTEGER' ||
          props.definition.valueType === 'REAL'
        }
      >
        <NumberField
          label={label()}
          hideLabel={props.hideLabel}
          value={asNumber()}
          decimalLimit={
            props.definition.valueType === 'INTEGER' ? 0 : undefined
          }
          disabled={props.disabled}
          onChange={value => props.onChange(value ?? null)}
        />
      </Match>
      <Match when={props.definition.valueType === 'DATE'}>
        <DateField
          label={label()}
          hideLabel={props.hideLabel}
          value={asString() ?? null}
          disabled={props.disabled}
          onChange={value => props.onChange(value || null)}
        />
      </Match>
    </Switch>
  );
};
