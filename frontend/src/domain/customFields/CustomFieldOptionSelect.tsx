import { Combobox } from '../../ui/elements/selectors/Combobox';
import {
  orderOptionsHierarchically,
  type CustomFieldDef,
  type OrderedOption,
} from './parse';

// The editable OPTION control (spec/ui-standards/custom-fields › option fields):
// a searchable picker over the field's options, hierarchical — a parent's
// children nest beneath it, indented by depth. The stored/emitted value is the
// option's id, never its name. A domain wrapper over the generic `Combobox`
// (like LocationVolumeSelect / ShippingMethodSelect) so the option hierarchy
// never leaks into the ui library.
export const CustomFieldOptionSelect = (props: {
  def: CustomFieldDef;
  /** Selected option id ('' when none). */
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  /** Hide the picker's own label (default false — label shown above). */
  hideLabel?: boolean;
  testId?: string;
}) => {
  const items = (): OrderedOption[] =>
    orderOptionsHierarchically(props.def.options);
  const selected = () => items().find(o => o.option.id === props.value);
  return (
    <Combobox<OrderedOption>
      label={props.def.name}
      hideLabel={props.hideLabel}
      items={items()}
      itemToString={o => o.option.name}
      itemToValue={o => o.option.id}
      value={props.value || undefined}
      selectedItem={selected()}
      onChange={item => props.onChange(item?.option.id ?? '')}
      disabled={props.disabled}
      inputTestId={props.testId}
      filter={(o, input) =>
        o.option.name.toLowerCase().includes(input.toLowerCase())
      }
      renderItem={o => (
        <span style={{ 'padding-inline-start': `${o.depth}rem` }}>
          {o.option.name}
        </span>
      )}
    />
  );
};
