import { createSignal, For, type Component } from 'solid-js';
import { createStore } from 'solid-js/store';
import { t } from '../../../intl';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { Button } from '../../../ui/elements/buttons/Button';
import { ContentContainer } from '../../../ui/layout/ContentContainer/ContentContainer';
import {
  CustomFieldInput,
  type CustomFieldDefinition,
} from '../../../domain/invoiceCustomFields';

// The Custom fields tab (spec/prescriptions/ui-surface.md S3; AC-CF1/CF3): the
// VISIBLE (non-prominent) custom fields, edited behind an explicit Save (unlike
// the toolbar's prominent fields, which save on change). A local draft buffers
// the edits; Save patches all changed keys in one update. Rendered only when
// the scope has ≥1 visible field.

export interface CustomFieldsTabProps {
  definitions: readonly CustomFieldDefinition[];
  /** The invoice's current customFields blob. */
  values: Record<string, unknown>;
  disabled: boolean;
  /** Patch the changed keys (a JSON object merged server-side). */
  onSave: (patch: Record<string, unknown>) => void;
}

export const CustomFieldsTab: Component<CustomFieldsTabProps> = props => {
  // A draft keyed by field key; seeded from the current values, diffed on save
  // so only changed keys are sent.
  const [draft, setDraft] = createStore<Record<string, unknown>>({
    ...props.values,
  });
  const [dirty, setDirty] = createSignal(false);

  const save = () => {
    const patch: Record<string, unknown> = {};
    for (const definition of props.definitions) {
      const key = definition.key;
      if (draft[key] !== props.values[key]) patch[key] = draft[key] ?? null;
    }
    if (Object.keys(patch).length > 0) props.onSave(patch);
    setDirty(false);
  };

  return (
    <ContentContainer>
      <For each={props.definitions}>
        {definition => (
          <FieldRow label={definition.name || definition.key}>
            <CustomFieldInput
              definition={definition}
              hideLabel
              value={draft[definition.key]}
              disabled={props.disabled}
              onChange={value => {
                setDraft(definition.key, value);
                setDirty(true);
              }}
            />
          </FieldRow>
        )}
      </For>
      <Button
        disabled={props.disabled || !dirty()}
        data-testid="save-custom-fields-button"
        onClick={save}
      >
        {t('button.save')}
      </Button>
    </ContentContainer>
  );
};
