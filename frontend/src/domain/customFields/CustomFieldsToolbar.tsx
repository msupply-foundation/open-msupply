import { For, Show } from 'solid-js';
import { FieldRow } from '../../ui/elements/inputs/FieldRow';
import { createDebouncedEdit } from '../debouncedEdit';
import { customFieldDefinitions } from './customFieldsResource';
import { CustomFieldInput } from './CustomFieldInput';
import {
  parseCustomField,
  parseCustomFields,
  partitionCustomFields,
} from './parse';

// PROMINENT custom fields promoted to the detail-view toolbar
// (spec/ui-standards/ custom-fields › the toolbar promotion). Auto-saves like
// the other toolbar fields: a debounced buffer flushes one patch per settled
// burst of edits (createDebouncedEdit), never a Save button. Absent when the
// scope configures no prominent fields. `recordId` keys the buffer so it
// re-seeds if the toolbar is reused across records without a remount. When
// `disabled` (the record is read-only, e.g. a Verified shipment) the fields
// STAY in the toolbar — a prominent field's home is the primary surface — but
// render disabled; the disabled controls emit no changes, so no save fires.
export const CustomFieldsToolbar = (props: {
  scope: string;
  recordId: string;
  values: unknown;
  disabled?: boolean;
  /**
   * How each field wears its label, matching the header it sits in:
   * - `inline` (default) — a FieldRow, bold label beside the control, for a
   *   header still built on the generic `<Toolbar>`.
   * - `field` — the control's own label above it, for a `<HeaderToolbar>` field
   *   cluster, whose FormRow lays the fields out as equal shares.
   */
  layout?: 'inline' | 'field';
  onSave: (patch: Record<string, unknown>) => void;
}) => {
  const reader = customFieldDefinitions(props.scope);
  const prominent = () =>
    partitionCustomFields(reader.noSuspense(), true).prominent;

  const edit = createDebouncedEdit<Record<string, unknown>>({
    id: () => props.recordId,
    initial: () => parseCustomFields(props.values),
    save: patch => props.onSave(patch),
  });

  return (
    <Show when={prominent().length > 0}>
      <For each={prominent()}>
        {def => {
          const field = parseCustomField(def);
          const input = (hideLabel: boolean) => (
            <CustomFieldInput
              field={field}
              value={edit.state[def.key]}
              disabled={props.disabled}
              hideLabel={hideLabel}
              size="small"
              onChange={v => edit.setField(def.key, v)}
            />
          );
          // Match the other fields in the same header. A boolean is a
          // self-labelling checkbox, so it never takes a wrapper; the rest
          // either sit in a FieldRow (inline label) or carry their own label
          // above the control (the HeaderToolbar cluster's shape).
          if (field.kind === 'boolean' || props.layout === 'field')
            return input(false);
          return <FieldRow label={def.name}>{input(true)}</FieldRow>;
        }}
      </For>
    </Show>
  );
};
