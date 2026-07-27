import { createEffect, createResource, createSignal, Show } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { NumberField } from '../../../ui/elements/inputs/NumberField';
import { Button } from '../../../ui/elements/buttons/Button';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { SaveIcon } from '../../../ui/icons';
import { t } from '../../../intl';
import {
  buildSyncInput,
  canSaveSyncSettings,
  initialSyncForm,
  SYNC_SAVE_FALLBACK_ERROR,
  syncSaveErrorKey,
  type SyncFormState,
} from './syncForm';
import { SyncSettings, UpdateSyncSettings } from './syncSettings.generated';
import styles from '../Settings.module.css';

/*
 * Synchronisation settings (spec/settings/ui-surface.md § Synchronisation) —
 * Server Admin only (gated by the page). Saving is not merely storing four
 * fields: the SERVER performs a live authentication round-trip against the
 * target before persisting anything, unless url/site/password all evaluate as
 * unchanged (OMS-REG-SET-02.9, .13, .14 — server-enforced; this form just reports the
 * outcome). Save stays disabled until all four fields are filled (OMS-REG-SET-02.7/.8) and
 * the password always starts blank (OMS-REG-SET-02.12).
 */
export const SyncSection = () => {
  // Stored settings (never includes the password). Non-suspending read —
  // this section lives inside an already-open page (kdd/solid-reactivity-
  // pitfalls § no remounts).
  const [storedData, { refetch }] = createResource(async () => {
    const result = await graphqlFetch(SyncSettings, {});
    return result.kind === 'success' ? result.data.syncSettings : null;
  });
  const stored = () =>
    storedData.state === 'ready' || storedData.state === 'refreshing'
      ? storedData.latest
      : null;

  const [form, setForm] = createSignal<SyncFormState>(initialSyncForm(null));
  const [saving, setSaving] = createSignal(false);
  const [saved, setSaved] = createSignal(false);
  const [saveError, setSaveError] = createSignal<{
    message: string;
    detail?: string;
  }>();
  const setOutcome = (
    outcome: { message: string; detail?: string } | 'success' | undefined
  ) => {
    setSaved(outcome === 'success');
    setSaveError(outcome === 'success' ? undefined : outcome);
  };

  // Seed url/site/interval from the stored settings once they arrive; the
  // password field deliberately stays blank (OMS-REG-SET-02.12). Only seed while the
  // user hasn't started editing (their in-progress input must never be
  // overwritten by a late fetch).
  let touched = false;
  createEffect(() => {
    const settings = stored();
    if (settings && !touched) setForm(initialSyncForm(settings));
  });

  const edit = (patch: Partial<SyncFormState>) => {
    touched = true;
    setOutcome(undefined);
    setForm({ ...form(), ...patch });
  };

  const save = async () => {
    if (!canSaveSyncSettings(form()) || saving()) return;
    setSaving(true);
    setOutcome(undefined);
    // `background` keeps a plain network failure out of the global
    // unexpected-error modal: this form owns its failure surface (the
    // previous settings remain in effect either way — OMS-REG-SET-02.9's fallback).
    const result = await graphqlFetch(
      UpdateSyncSettings,
      { input: buildSyncInput(form()) },
      { background: true }
    );
    if (result.kind === 'success') {
      const payload = result.data.updateSyncSettings;
      if (payload.__typename === 'SyncSettingsNode') {
        // Persisted — confirm, re-read the stored settings, and blank the
        // password again (OMS-REG-SET-02.12, OMS-REG-SET-02.13).
        setOutcome('success');
        touched = false;
        setForm({ ...form(), password: '' });
        await refetch();
      } else {
        // The server's live check failed — a reason-specific message from
        // the returned variant; nothing was stored (OMS-REG-SET-02.9).
        setOutcome({
          message: t(syncSaveErrorKey(payload)),
          detail: payload.fullError,
        });
      }
    } else if (result.kind !== 'unauthenticated') {
      // Unstructured failure (e.g. the request itself failed): generic
      // fallback, previous settings remain in effect.
      setOutcome({ message: t(SYNC_SAVE_FALLBACK_ERROR) });
    }
    setSaving(false);
  };

  return (
    <form
      class={styles.sectionBody}
      aria-label={t('heading.settings-sync')}
      onSubmit={e => {
        // Enter anywhere in the form saves, same as the Save button
        // (rules § Synchronisation).
        e.preventDefault();
        void save();
      }}
    >
      {/* Labelled field rows per the spec's Layout (ui-surface § Layout):
          bold label inline-start, control inline-end, wrapped control's own
          label hidden. */}
      <FieldRow label={t('label.settings-url')}>
        <TextField
          label={t('label.settings-url')}
          hideLabel
          width="long"
          value={form().url}
          onInput={e => edit({ url: e.currentTarget.value })}
          disabled={saving()}
          data-testid="sync-settings-url"
        />
      </FieldRow>
      <FieldRow label={t('label.settings-username')}>
        <TextField
          label={t('label.settings-username')}
          hideLabel
          width="long"
          value={form().username}
          onInput={e => edit({ username: e.currentTarget.value })}
          disabled={saving()}
          data-testid="sync-settings-username"
        />
      </FieldRow>
      {/* Plain masked input — the shared library has no visibility-toggle
          affordance yet (registry gap, flagged in BUILD_REPORT.md); matches
          the app's other password fields (login, initialisation). */}
      <FieldRow label={t('label.settings-password')}>
        <TextField
          label={t('label.settings-password')}
          hideLabel
          width="long"
          type="password"
          autocomplete="off"
          value={form().password}
          onInput={e => edit({ password: e.currentTarget.value })}
          disabled={saving()}
          data-testid="sync-settings-password"
        />
      </FieldRow>
      <FieldRow label={t('label.settings-interval')}>
        <NumberField
          label={t('label.settings-interval')}
          hideLabel
          min={1}
          value={form().intervalSeconds}
          onChange={intervalSeconds => edit({ intervalSeconds })}
          disabled={saving()}
          data-testid="sync-settings-interval"
        />
      </FieldRow>
      <Show when={saved()}>
        <Alert severity="success">{t('success.sync-settings')}</Alert>
      </Show>
      <Show when={saveError()}>
        {error => (
          <Alert severity="error">
            <div>{error().message}</div>
            <Show when={error().detail}>
              {detail => (
                <details>
                  <summary>{t('error.more-info')}</summary>
                  <pre>{detail()}</pre>
                </details>
              )}
            </Show>
          </Alert>
        )}
      </Show>
      <div class={styles.actions}>
        <Button
          type="submit"
          icon={<SaveIcon />}
          loading={saving()}
          disabled={!canSaveSyncSettings(form())}
          data-testid="sync-settings-save"
        >
          {t('button.save')}
        </Button>
      </div>
    </form>
  );
};
