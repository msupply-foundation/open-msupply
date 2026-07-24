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
import {
  parseCustomField,
  parseCustomFields,
  partitionCustomFields,
} from './parse';

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
    // untouched. A cleared field carries its empty value; the vertical's
    // `onSave` decides the wire encoding (e.g. null to delete a key).
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
        <DetailContainer>
          <DetailSection>
            <For each={tabDefs()}>
              {def => (
                <DetailRow
                  label={def.name}
                  control={
                    <CustomFieldInput
                      field={parseCustomField(def)}
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
