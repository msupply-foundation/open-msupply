import { Match, Switch } from 'solid-js';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { NumberField } from '../../../ui/elements/inputs/NumberField';
import { DateField } from '../../../ui/elements/inputs/DateField';
import { BareCheckbox } from '../../../ui/elements/inputs/BareCheckbox';
import { Select } from '../../../ui/elements/selectors/Select';
import { allowedValues, type PropertyDefinition } from './storeEditorLogic';

/*
 * ONE property definition, rendered as one labelled field row
 * (spec/settings/ui-surface.md § S5 › Properties panel). The label is the
 * definition's own display name — DATA, shown verbatim, never run through
 * t() — so the row's control carries no visible label of its own.
 *
 * The control follows the definition's declared kind: yes/no → checkbox,
 * whole/fractional number → number, date → date picker, a choice among the
 * definition's allowed values → single-select over exactly those, free text →
 * short text. Written out per kind rather than resolved from a config map
 * (kdd/explicit-composition): each branch is one readable control with its own
 * conversion, and the next kind the schema grows is a new <Match>, not a new
 * entry in an indirection table.
 */
export const StorePropertyField = (props: {
  definition: PropertyDefinition;
  /** The staged value from the draft — the column is opaque, so `unknown`. */
  value: unknown;
  disabled: boolean;
  onChange: (value: string | number | boolean | null | undefined) => void;
}) => {
  const property = () => props.definition.property;
  const label = () => property().name;
  // Locale-stable hook, keyed on the definition's own key (e2e/TESTIDS.md).
  const testId = () => `store-property-${property().key}`;
  const options = () => allowedValues(property().allowedValues);

  // The stored value read as the kind's own type. A document written by
  // another client (or an earlier definition of the same key) can hold
  // anything, so each read is defensive rather than cast.
  const asText = () => (typeof props.value === 'string' ? props.value : '');
  const asNumber = () =>
    typeof props.value === 'number' ? props.value : undefined;
  const asChecked = () => props.value === true;

  return (
    <FieldRow label={label()}>
      <Switch>
        <Match when={property().valueType === 'BOOLEAN'}>
          <BareCheckbox
            checked={asChecked()}
            disabled={props.disabled}
            aria-label={label()}
            data-testid={testId()}
            onChange={event => props.onChange(event.currentTarget.checked)}
          />
        </Match>
        <Match
          when={
            property().valueType === 'INTEGER' ||
            property().valueType === 'FLOAT'
          }
        >
          <NumberField
            label={label()}
            hideLabel
            value={asNumber()}
            // A whole number stays whole; a fractional one gets the reference
            // client's five places.
            decimalLimit={property().valueType === 'FLOAT' ? 5 : 0}
            // Numbers are non-negative unless the definition says otherwise —
            // the reference client's convention: the sentinel rides in the
            // definition's allowed values, which a number field otherwise has
            // no use for.
            allowNegative={options().some(v => v.toLowerCase() === 'negative')}
            disabled={props.disabled}
            data-testid={testId()}
            onChange={value => props.onChange(value)}
          />
        </Match>
        <Match when={property().valueType === 'DATE'}>
          <DateField
            label={label()}
            hideLabel
            value={asText() === '' ? null : asText()}
            disabled={props.disabled}
            testId={testId()}
            onChange={value => props.onChange(value)}
          />
        </Match>
        <Match when={property().valueType === 'STRING' && options().length > 0}>
          <Select
            label={label()}
            hideLabel
            options={options().map(value => ({ value, label: value }))}
            value={asText()}
            disabled={props.disabled}
            testId={testId()}
            onValueChange={value => props.onChange(value)}
          />
        </Match>
        <Match when={property().valueType === 'STRING'}>
          <TextField
            label={label()}
            hideLabel
            value={asText()}
            disabled={props.disabled}
            data-testid={testId()}
            onInput={event => props.onChange(event.currentTarget.value)}
          />
        </Match>
      </Switch>
    </FieldRow>
  );
};
