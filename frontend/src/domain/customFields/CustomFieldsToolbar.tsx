import { For, Show } from 'solid-js';
import { FieldRow } from '../../ui/elements/inputs/FieldRow';
import { FormRowItem } from '../../ui/layout/Form/FormRowItem';
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
   *   cluster, whose FormRow gives each field a share of the row: the equal
   *   default, or the narrower one a short fixed-length value asks for below.
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
          // self-labelling checkbox, so it never takes a FieldRow; the rest
          // either sit in a FieldRow (inline label) or carry their own label
          // above the control (the HeaderToolbar cluster's shape).
          if (props.layout === 'field') {
            // In a header cluster a field's share follows its DATA, not the
            // field count (#782, spec/ui-standards/layout.md): a code, a number
            // and a date are short fixed-length values, so they take a
            // below-average share and leave the surplus to the long free-text
            // and name fields beside them. Free text (and an `unsupported`
            // field's disabled placeholder) keeps the row's equal share — as
            // does a MULTI_OPTION, whose value is a list of tags and so is not
            // a short fixed-length value at all.
            // The 9.5rem floor stays just under the row's own 10rem so promoting
            // a field can only ever move the cluster's wrap point outward — a
            // header must not gain a line on a narrower screen than it used to.
            const narrow =
              field.kind === 'option' ||
              field.kind === 'number' ||
              field.kind === 'date';
            // The 14rem ceiling is what a short value can actually use (~116px
            // of text after the control's own chrome). It keeps the surplus on a
            // wide screen flowing past these fields to the long name ones, and
            // stops a promoted field that wraps to its own line from stretching
            // across the whole of it — which would read as the header promoting
            // the least important field it has.
            return narrow ? (
              <FormRowItem weight={0.9} minWidth="9.5rem" maxWidth="14rem">
                {input(false)}
              </FormRowItem>
            ) : (
              input(false)
            );
          }
          if (field.kind === 'boolean') return input(false);
          return <FieldRow label={def.name}>{input(true)}</FieldRow>;
        }}
      </For>
    </Show>
  );
};
