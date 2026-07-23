import { For, Show } from 'solid-js';
import { createDebouncedEdit } from '../debouncedEdit';
import { customFieldDefinitions } from './customFieldsResource';
import { CustomFieldInput } from './CustomFieldInput';
import { parseCustomFields, partitionCustomFields } from './customFields';

// PROMINENT custom fields promoted to the detail-view toolbar (spec/ui-standards/
// custom-fields › the toolbar promotion). Auto-saves like the other toolbar
// fields: a debounced buffer flushes one patch per settled burst of edits
// (createDebouncedEdit), never a Save button. Absent when the scope configures
// no prominent fields. `recordId` keys the buffer so it re-seeds if the toolbar
// is reused across records without a remount.
export const CustomFieldsToolbar = (props: {
  scope: string;
  recordId: string;
  values: unknown;
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
        {def => (
          <label
            style={{
              display: 'flex',
              'flex-direction': 'column',
              gap: '0.25rem',
            }}
          >
            <span>{def.name}</span>
            <CustomFieldInput
              def={def}
              value={edit.state[def.key]}
              onChange={v => edit.setField(def.key, v)}
            />
          </label>
        )}
      </For>
    </Show>
  );
};
