import { MultiSelect } from '../../ui/elements/selectors/MultiSelect';
import {
  applyOptionToggle,
  collapseSelectionToStored,
  expandStoredToSelection,
  orderOptionsHierarchically,
  type CustomFieldDef,
  type OrderedOption,
} from './parse';

// The editable MULTI_OPTION control (spec/ui-standards/custom-fields › option
// fields): the same option hierarchy as CustomFieldOptionSelect, ticked in any
// number. A domain wrapper over the generic `MultiSelect`, as its single-select
// sibling wraps `Combobox`, so the option hierarchy never leaks into the ui
// library.
//
// The control works in the EXPANDED set — every ticked node, so a parent shows
// ticked exactly when all its children are — while the stored value is the
// MINIMAL covering set. Both conversions, and the tick rule itself, live in
// parse.ts and are shared with the list filter (parse › applyOptionToggle), so
// the two surfaces cannot drift.
//
// `readOnly` is the locked-record rendering: openable and focusable, nothing
// selectable. Not `disabled` — the trigger summarises the value, so a control
// that can't be opened hides the values it doesn't have room to show.
export const CustomFieldOptionMultiSelect = (props: {
  def: CustomFieldDef;
  /** Stored option ids (the minimal covering set). */
  value: string[];
  onChange: (ids: string[]) => void;
  readOnly?: boolean;
  /** Hide the picker's own label (default false — label shown above). */
  hideLabel?: boolean;
  size?: 'default' | 'small';
  testId?: string;
}) => {
  const items = (): OrderedOption[] =>
    orderOptionsHierarchically(props.def.options);
  // The picker's ticked set: the stored value expanded down each subtree.
  const ticked = (): string[] =>
    expandStoredToSelection(props.def.options, props.value);
  const selected = (): OrderedOption[] =>
    items().filter(o => ticked().includes(o.option.id));
  // Stored ids the definition doesn't know (an option deleted before its row
  // ever synced). They can't be listed, so they can't be unticked — carrying
  // them through an edit keeps a value the user can't see from being silently
  // dropped by an unrelated change.
  const unlisted = (): string[] => {
    const known = new Set(props.def.options.map(o => o.id));
    return props.value.filter(id => !known.has(id));
  };

  return (
    <MultiSelect<OrderedOption>
      label={props.def.name}
      hideLabel={props.hideLabel}
      size={props.size}
      readOnly={props.readOnly}
      inputTestId={props.testId}
      items={items()}
      itemToString={o => o.option.name}
      itemToValue={o => o.option.id}
      selectedItems={selected()}
      onChange={next => {
        const nextIds = next.map(o => o.option.id);
        const toggled = applyOptionToggle(props.def.options, ticked(), nextIds);
        props.onChange([
          ...collapseSelectionToStored(props.def.options, toggled),
          ...unlisted(),
        ]);
      }}
      renderItem={o => (
        <span style={{ 'padding-inline-start': `${o.depth}rem` }}>
          {o.option.name}
        </span>
      )}
    />
  );
};
