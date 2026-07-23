import { For, Show, createSignal } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { t } from '../../intl';
import { EmptyState } from '../../ui/elements/feedback/EmptyState';
import { Spinner } from '../../ui/elements/feedback/Spinner';
import { Button } from '../../ui/elements/buttons/Button';
import { ConfirmDialog } from '../../ui/elements/feedback/ConfirmDialog';
import { DetailContainer } from '../../ui/layout/Detail/DetailContainer';
import { DetailSection } from '../../ui/layout/Detail/DetailSection';
import { DetailRow } from '../../ui/layout/Detail/DetailRow';
import { createConfirmOnLeave } from '../confirmOnLeave';
import { customFieldDefinitions } from './customFieldsResource';
import { CustomFieldInput } from './CustomFieldInput';
import { parseCustomFields, partitionCustomFields } from './customFields';

// The editable custom-fields tab (spec/ui-standards/custom-fields › editing):
// the scope's VISIBLE fields (prominent ones live in the toolbar) as editable
// rows over a local draft, with an EXPLICIT Save and a discard-on-leave guard.
// The mutation itself is the vertical's — `onSave` receives the tab's keys
// patch-merged server-side — so this component owns only the draft + save
// lifecycle, never a GraphQL call (kdd/state-management).
export const CustomFieldsEditTab = (props: {
  scope: string;
  values: unknown;
  /** Fire the vertical's update with the patch; resolve true on success. */
  onSave: (patch: Record<string, unknown>) => Promise<boolean>;
}) => {
  const reader = customFieldDefinitions(props.scope);
  const tabDefs = () => partitionCustomFields(reader.noSuspense(), true).tab;

  const [draft, setDraft] = createStore<Record<string, unknown>>(
    parseCustomFields(props.values)
  );
  const [dirty, setDirty] = createSignal(false);
  const [saving, setSaving] = createSignal(false);

  const resetDraft = () => {
    setDraft(reconcile(parseCustomFields(props.values)));
    setDirty(false);
  };

  const leaveGuard = createConfirmOnLeave({
    isDirty: dirty,
    onDiscard: resetDraft,
  });

  const setField = (key: string, value: unknown) => {
    setDraft(key, value);
    setDirty(true);
  };

  const save = async () => {
    if (!dirty() || saving()) return;
    setSaving(true);
    // Send every tab key's current value; the server patch-merges, so untouched
    // keys are unaffected and re-sending them is harmless.
    const patch: Record<string, unknown> = {};
    for (const def of tabDefs()) patch[def.key] = draft[def.key];
    const ok = await props.onSave(patch);
    setSaving(false);
    if (ok) setDirty(false);
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
        <DetailContainer>
          <DetailSection>
            <For each={tabDefs()}>
              {def => (
                <DetailRow
                  label={def.name}
                  control={
                    <CustomFieldInput
                      def={def}
                      value={draft[def.key]}
                      onChange={v => setField(def.key, v)}
                    />
                  }
                />
              )}
            </For>
          </DetailSection>
          <div style={{ 'margin-block-start': '1rem' }}>
            <Button
              variant="primary"
              disabled={!dirty()}
              loading={saving()}
              onClick={() => void save()}
            >
              {t('button.save')}
            </Button>
          </div>
        </DetailContainer>
        <ConfirmDialog
          open={leaveGuard.open()}
          title={t('heading.are-you-sure')}
          message={t('messages.discard-changes')}
          confirmLabel={t('button.discard')}
          cancelLabel={t('button.cancel')}
          onConfirm={leaveGuard.confirm}
          onClose={leaveGuard.cancel}
        />
      </Show>
    </Show>
  );
};
