import { createEffect, createResource, createSignal, Show } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { PasswordField } from '../../../ui/elements/inputs/PasswordField';
import { NumberField } from '../../../ui/elements/inputs/NumberField';
import { Button } from '../../../ui/elements/buttons/Button';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { ErrorDetails } from '../../../ui/elements/feedback/ErrorDetails';
import { SaveIcon } from '../../../ui/icons';
import { t } from '../../../intl';
import {
  buildSyncInput,
  initialSyncForm,
  SYNC_SAVE_FALLBACK_ERROR,
  syncFieldErrors,
  syncSaveErrorKey,
  type SyncFormState,
} from './syncForm';
import { SyncSettings, UpdateSyncSettings } from './syncSettings.generated';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { HStack } from '../../../ui/layout/Stack/HStack';
import { createFormValidation } from '../../../ui/layout/Form/formValidation';
import { DisclosureToggle } from '../../../ui/elements/buttons/DisclosureToggle';

/** Ties the advanced disclosure's toggle to the region it reveals. */
const ADVANCED_REGION_ID = 'sync-settings-advanced';

/*
 * Synchronisation settings (spec/settings/ui-surface.md § Synchronisation) —
 * Server Admin only (gated by the page). Saving is not merely storing the
 * fields: the SERVER performs a live authentication round-trip against the
 * target before persisting anything, unless url/site/password all evaluate as
 * unchanged (OMS-REG-SET-02.9, .13, .14 — server-enforced; this form just
 * reports the outcome). Save is ALWAYS clickable and validates on click
 * (OMS-REG-SET-02.7/.8, D98) — the batch size carries no rule, being optional
 * (OMS-REG-SET-02.15) — and the password always starts blank
 * (OMS-REG-SET-02.12).
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
  // password field deliberately stays blank (OMS-REG-SET-02.12). Only seed
  // while the user hasn't started editing (their in-progress input must never
  // be overwritten by a late fetch).
  let touched = false;
  createEffect(() => {
    const settings = stored();
    if (settings && !touched) setForm(initialSyncForm(settings));
  });

  // Quiet on open, full on Save (D98): every required rule is evaluated from
  // the start but shows nothing until the first Save click arms them.
  const validation = createFormValidation(() => syncFieldErrors(form()));

  const [showAdvanced, setShowAdvanced] = createSignal(false);

  const edit = (patch: Partial<SyncFormState>) => {
    touched = true;
    setOutcome(undefined);
    setForm({ ...form(), ...patch });
  };

  const save = async () => {
    if (saving()) return;
    // Validate on click, never by disabling the button: an empty required
    // field shows its own message and nothing is sent (OMS-REG-SET-02.7/.8).
    validation.arm();
    if (!validation.valid()) return;
    setSaving(true);
    setOutcome(undefined);
    // `background` keeps a plain network failure out of the global
    // unexpected-error modal: this form owns its failure surface (the
    // previous settings remain in effect either way — OMS-REG-SET-02.9's
    // fallback).
    const result = await graphqlFetch(
      UpdateSyncSettings,
      { input: buildSyncInput(form()) },
      { background: true }
    );
    if (result.kind === 'success') {
      const payload = result.data.updateSyncSettings;
      if (payload.__typename === 'SyncSettingsNode') {
        // Persisted — confirm, re-read the stored settings, and blank the
        // password again (OMS-REG-SET-02.12, OMS-REG-SET-02.13). Disarm with
        // it: the blanked password re-trips its own required rule, which must
        // not surface as an error on a save that just succeeded.
        setOutcome('success');
        touched = false;
        validation.reset();
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
      aria-label={t('heading.settings-sync')}
      onSubmit={e => {
        // Enter anywhere in the form saves, same as the Save button
        // (rules § Synchronisation).
        e.preventDefault();
        void save();
      }}
    >
      <Stack>
        {/* The standard form layout (kdd/form-layout): stacked full-width
          fields carrying their own labels, with the two numbers paired in a
          FormRow. The accordion header titles the group, so there is no
          FormSection of its own. */}
        <TextField
          label={t('label.settings-url')}
          value={form().url}
          error={validation.errorFor('url')}
          onInput={e => edit({ url: e.currentTarget.value })}
          disabled={saving()}
          data-testid="sync-settings-url"
        />
        <TextField
          label={t('label.settings-username')}
          value={form().username}
          error={validation.errorFor('username')}
          onInput={e => edit({ username: e.currentTarget.value })}
          disabled={saving()}
          data-testid="sync-settings-username"
        />
        <PasswordField
          label={t('label.settings-password')}
          autocomplete="off"
          value={form().password}
          error={validation.errorFor('password')}
          onInput={e => edit({ password: e.currentTarget.value })}
          disabled={saving()}
          data-testid="sync-settings-password"
        />
        <NumberField
          label={t('label.settings-interval')}
          min={1}
          value={form().intervalSeconds}
          error={validation.errorFor('intervalSeconds')}
          onChange={intervalSeconds => edit({ intervalSeconds })}
          disabled={saving()}
          data-testid="sync-settings-interval"
        />
        {/* The batch size is an optional override behind a collapsed advanced
          disclosure — the same affordance, in the same place in the form, as
          site initialisation's (spec/startup/rules § initialisation). */}
        <HStack justify="end">
          <DisclosureToggle
            expanded={showAdvanced()}
            controls={ADVANCED_REGION_ID}
            onClick={() => setShowAdvanced(previous => !previous)}
            data-testid="sync-settings-advanced-toggle"
          >
            {showAdvanced()
              ? t('label.hide-advanced-options')
              : t('label.show-advanced-options')}
          </DisclosureToggle>
        </HStack>
        <Show when={showAdvanced()}>
          <div id={ADVANCED_REGION_ID}>
            <NumberField
              label={t('label.settings-batch-size')}
              helperText={t('label.settings-batch-size-helper')}
              min={1}
              value={form().batchSize}
              onChange={batchSize => edit({ batchSize })}
              disabled={saving()}
              data-testid="sync-settings-batch-size"
            />
          </div>
        </Show>
        <Show when={saved()}>
          <Alert severity="success">{t('success.sync-settings')}</Alert>
        </Show>
        <Show when={saveError()}>
          {error => (
            <Alert severity="error">
              <div>{error().message}</div>
              <Show when={error().detail}>
                {detail => <ErrorDetails detail={detail()} />}
              </Show>
            </Alert>
          )}
        </Show>
        <HStack justify="end" gap="md">
          <Button
            type="submit"
            icon={<SaveIcon />}
            loading={saving()}
            data-testid="sync-settings-save"
          >
            {t('button.save')}
          </Button>
        </HStack>
      </Stack>
    </form>
  );
};
