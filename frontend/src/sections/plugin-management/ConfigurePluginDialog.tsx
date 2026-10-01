import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  Match,
  Show,
  Switch,
  untrack,
} from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { rejectionFrom, type Rejection } from '@/api/rejection';
import { t } from '@/intl';
import { configurationFor } from '@/plugins/registry';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Spinner } from '@/ui/elements/feedback/Spinner';
import {
  CancelButton,
  DialogSaveButton,
} from '@/ui/elements/buttons/StandardButtons';
import { PluginSlotOutlet } from '@/ui/elements/plugins/PluginSlotOutlet';
import {
  InsertPluginConfiguration,
  PluginConfiguration,
  UpdatePluginConfiguration,
} from './plugins.generated';
import {
  configurationWrite,
  loadConfiguration,
  pickConfigurationRecord,
  type LoadedConfiguration,
} from './configuration';
import { RefusalAlert } from './RefusalAlert';

/*
 * S3 — Configure dialog (spec/plugin-management/ui-surface.md): a plugin's
 * own settings editor over its one installation-wide record. The host owns
 * the record — read, seed, hold the draft, write the whole value on Save —
 * and the editor only edits (plugins sdk-contract § the configuration
 * contribution).
 *
 * Mounted only while open (the list gates it), so each open reads the record
 * afresh and seeds a fresh draft.
 */

type EditorProps = { value: unknown; onChange: (next: unknown) => void };

export const ConfigurePluginDialog = (props: {
  storeId: string;
  pluginCode: string;
  onClose: () => void;
}) => {
  // Which editor: read once, at open. The registry only changes on a reload,
  // so this is the editor the row offered.
  const configuration = untrack(() => configurationFor(props.pluginCode));

  // First fetched on an interaction (opening the dialog) under the list's
  // already-open boundary, so it is read through `.state` only — never
  // `stored()` — and can never suspend the list (CLAUDE.md anti-default).
  const [stored] = createResource(
    () => ({ storeId: props.storeId, pluginCode: props.pluginCode }),
    async variables => {
      const result = await graphqlFetch(PluginConfiguration, variables, {
        returnGraphqlErrors: true,
      });
      return result.kind === 'success'
        ? {
            ok: true as const,
            record: pickConfigurationRecord(result.data.pluginData),
          }
        : { ok: false as const };
    }
  );
  const loaded = () => (stored.state === 'ready' ? stored.latest : undefined);

  // The draft. Seeded ONCE, when the read lands — never re-seeded, so nothing
  // the read does later can overwrite edits.
  const [seed, setSeed] = createSignal<LoadedConfiguration>();
  const [draft, setDraft] = createSignal<unknown>();
  createEffect(() => {
    const answer = loaded();
    if (!answer?.ok || !configuration || seed()) return;
    const initial = loadConfiguration(
      answer.record,
      configuration.defaultConfig
    );
    setSeed(initial);
    // Function form: a JSON value is never a function, but setDraft(fn) would
    // treat one as an updater.
    setDraft(() => initial.value);
  });

  const [saving, setSaving] = createSignal(false);
  const [refusal, setRefusal] = createSignal<Rejection>();

  const save = async () => {
    const initial = seed();
    if (!initial || saving()) return;
    setSaving(true);
    setRefusal(undefined);
    const write = configurationWrite(
      props.storeId,
      props.pluginCode,
      initial.recordId,
      draft()
    );
    const result =
      write.kind === 'insert'
        ? await graphqlFetch(InsertPluginConfiguration, write.variables, {
            returnGraphqlErrors: true,
          })
        : await graphqlFetch(UpdatePluginConfiguration, write.variables, {
            returnGraphqlErrors: true,
          });
    if (result.kind === 'success') {
      props.onClose();
      return;
    }
    if (result.kind === 'graphqlError')
      setRefusal(rejectionFrom(result.errors, ''));
    // Edits stay; the busy state is released (OMS-REG-MNG-07.60).
    setSaving(false);
  };

  // One contribution, memoised so its identity — and so the mounted editor —
  // survives every draft change (PluginSlotOutlet guarantee 1).
  const editor = createMemo(() =>
    configuration
      ? [
          {
            id: `${props.pluginCode}.configuration`,
            Component: configuration.Editor,
          },
        ]
      : []
  );

  return (
    <Dialog
      open
      onClose={props.onClose}
      dismissable={!saving()}
      title={t('title.configure-plugin-code', { code: props.pluginCode })}
      // The body is the plugin's, not ours to measure (Dialog › size).
      size="full"
      // Enter in the plugin's own fields must not save its half-typed form.
      enterConfirms={false}
      testId="configure-plugin-dialog"
      actions={
        <>
          <Show when={!saving()}>
            <CancelButton
              data-testid="dialog-button-cancel"
              onClick={props.onClose}
            />
          </Show>
          <Show when={configuration}>
            <DialogSaveButton
              data-testid="dialog-button-save"
              disabled={!seed()}
              loading={saving()}
              onClick={() => void save()}
            />
          </Show>
        </>
      }
    >
      <Show when={refusal()}>
        {rejection => (
          <RefusalAlert
            step={t('error.unable-to-save-plugin-config')}
            rejection={rejection()}
            testId="configure-plugin-error"
          />
        )}
      </Show>
      <Switch>
        <Match when={!configuration}>
          <Alert severity="error">
            <span data-testid="configure-plugin-error">
              {t('error.plugin-not-loaded', { code: props.pluginCode })}
            </span>
          </Alert>
        </Match>
        <Match when={loaded()?.ok === false}>
          <Alert severity="error">
            <span data-testid="configure-plugin-error">
              {t('error.unable-to-load-data')}
            </span>
          </Alert>
        </Match>
        <Match when={seed()}>
          <PluginSlotOutlet<EditorProps>
            contributions={editor()}
            slotProps={() => ({
              value: draft(),
              onChange: next => setDraft(() => next),
            })}
            errorFallback={t('error.plugin-unavailable')}
          />
        </Match>
        <Match when={true}>
          <Spinner />
        </Match>
      </Switch>
    </Dialog>
  );
};
