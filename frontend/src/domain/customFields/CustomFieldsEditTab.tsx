import { For, Show, createMemo, createSignal } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { t } from '../../intl';
import { EmptyState } from '../../ui/elements/feedback/EmptyState';
import { Spinner } from '../../ui/elements/feedback/Spinner';
import { SaveButton } from '../../ui/elements/buttons/StandardButtons';
import { ConfirmDialog } from '../../ui/elements/feedback/ConfirmDialog';
import { ContentContainer } from '../../ui/layout/ContentContainer/ContentContainer';
import { FormColumns } from '../../ui/layout/Form/FormColumns';
import { FormColumn } from '../../ui/layout/Form/FormColumn';
import { FormSection } from '../../ui/layout/Form/FormSection';
import { Stack } from '../../ui/layout/Stack/Stack';
import { HStack } from '../../ui/layout/Stack/HStack';
import { createConfirmOnLeave } from '../confirmOnLeave';
import { customFieldDefinitions } from './customFieldsResource';
import { CustomFieldInput } from './CustomFieldInput';
import {
  parseCustomField,
  parseCustomFields,
  partitionCustomFields,
  shownCustomFields,
  splitIntoColumns,
  type CustomFieldDef,
} from './parse';

// The editable custom-fields tab (spec/ui-standards/custom-fields › editing):
// the scope's tab fields as the standard sectioned edit form — each field on
// its own line with its LABEL ABOVE the control (matching the patient/stock
// detail forms), the fields split down TWO COLUMNS exactly as the read-only
// tab lays them out (CustomFieldsView) — over a local draft, with an EXPLICIT
// Save and a discard-on-leave guard. The mutation itself is the vertical's —
// `onSave` receives the tab's keys patch-merged server-side — so this component
// owns only the draft + save lifecycle, never a GraphQL call
// (kdd/state-management).
//
// `promoteToToolbar`: when the detail has a toolbar hosting PROMINENT fields
// (the invoice verticals), the tab shows only the non-prominent fields; without
// a toolbar (e.g. patients) it shows every shown field.
export const CustomFieldsEditTab = (props: {
  scope: string;
  values: unknown;
  promoteToToolbar?: boolean;
  /**
   * Read-only mode (e.g. the record's edit gate has closed — a Verified
   * shipment): the same label-above form, but the controls are disabled and
   * there is no Save, matching how the patient/stock detail forms render when
   * not editable. Saves can't fire, so `onSave` is never called.
   */
  disabled?: boolean;
  /** Fire the vertical's update with the patch; resolve true on success. */
  onSave: (patch: Record<string, unknown>) => Promise<boolean>;
}) => {
  const reader = customFieldDefinitions(props.scope);
  const tabDefs = () => {
    const defs = reader.noSuspense();
    return props.promoteToToolbar
      ? partitionCustomFields(defs, true).tab
      : shownCustomFields(defs);
  };

  // The two columns, split the same way the read-only tab splits them
  // (splitIntoColumns — configured order read down column one, then two).
  const columns = createMemo(() => splitIntoColumns(tabDefs()));
  const firstColumn = () => columns()[0];
  const secondColumn = () => columns()[1];

  const [draft, setDraft] = createStore<Record<string, unknown>>(
    parseCustomFields(props.values)
  );
  // The keys edited since the last save — so the patch carries ONLY changed
  // keys (a partial merge), never re-sends untouched ones.
  let changed = new Set<string>();
  const [dirty, setDirty] = createSignal(false);
  const [saving, setSaving] = createSignal(false);

  const resetDraft = () => {
    setDraft(reconcile(parseCustomFields(props.values)));
    changed = new Set();
    setDirty(false);
  };

  const leaveGuard = createConfirmOnLeave({
    isDirty: dirty,
    onDiscard: resetDraft,
  });

  const setField = (key: string, value: unknown) => {
    setDraft(key, value);
    changed.add(key);
    setDirty(true);
  };

  const save = async () => {
    if (!dirty() || saving() || changed.size === 0) return;
    setSaving(true);
    // Only the changed keys — a partial merge; the server leaves the rest
    // untouched. A cleared number/date/option carries null (CustomFieldInput's
    // contract), which the server's patch-merge treats as "remove the key".
    const patch: Record<string, unknown> = {};
    changed.forEach(key => {
      patch[key] = draft[key];
    });
    const ok = await props.onSave(patch);
    setSaving(false);
    if (ok) {
      changed = new Set();
      setDirty(false);
    }
  };

  return (
    <Show when={!reader.loading()} fallback={<Spinner center />}>
      <Show
        when={tabDefs().length > 0}
        fallback={
          <EmptyState
            data-testid="nothing-here"
            message={t('messages.no-custom-fields')}
          />
        }
      >
        {/* `padded` supplies the body's edge padding: every host is a fillBody
            detail page (full-bleed for its line table), so the form tab has no
            body padding to inherit. `form` is the two-column measure the
            read-only tab and the sibling detail forms use, so every custom-
            fields tab reads alike whichever surface renders it. */}
        <ContentContainer size="form" padded>
          <FormSection title={t('label.custom-fields')}>
            <FormColumns>
              <FormColumn>
                <FieldColumn
                  fields={firstColumn()}
                  draft={draft}
                  disabled={props.disabled}
                  setField={setField}
                />
              </FormColumn>
              {/* Only when it has fields: an empty column would still claim its
                  half of the row and squeeze the filled one. */}
              <Show when={secondColumn().length > 0}>
                <FormColumn>
                  <FieldColumn
                    fields={secondColumn()}
                    draft={draft}
                    disabled={props.disabled}
                    setField={setField}
                  />
                </FormColumn>
              </Show>
            </FormColumns>
            <Show when={!props.disabled}>
              {/* An HStack so the button shrinks to its own width instead of
                  stretching across the section's stack. */}
              <HStack>
                <SaveButton
                  collapsible={false}
                  disabled={!dirty()}
                  loading={saving()}
                  onClick={() => void save()}
                />
              </HStack>
            </Show>
          </FormSection>
        </ContentContainer>
        <ConfirmDialog
          open={leaveGuard.open()}
          title={t('heading.are-you-sure')}
          message={t('messages.discard-changes')}
          confirmLabel={t('button.discard')}
          onConfirm={leaveGuard.confirm}
          onClose={leaveGuard.cancel}
        />
      </Show>
    </Show>
  );
};

// One column's worth of fields, matching the read-only tab's FieldColumn.
// FormColumn's own gap is the between-SECTIONS rhythm (--space-6), too airy for
// individual fields, so the fields carry their own tighter stack.
const FieldColumn = (props: {
  fields: CustomFieldDef[];
  draft: Record<string, unknown>;
  disabled?: boolean;
  setField: (key: string, value: unknown) => void;
}) => (
  <Stack gap="md">
    <For each={props.fields}>
      {def => (
        <CustomFieldInput
          field={parseCustomField(def)}
          value={props.draft[def.key]}
          disabled={props.disabled}
          onChange={v => props.setField(def.key, v)}
        />
      )}
    </For>
  </Stack>
);
