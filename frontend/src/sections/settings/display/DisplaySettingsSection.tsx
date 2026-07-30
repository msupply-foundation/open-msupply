import { createResource, createSignal, Show } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { hasPermission } from '../../../store/storeContext';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { TextArea } from '../../../ui/elements/inputs/TextArea';
import { ToggleSwitch } from '../../../ui/elements/inputs/ToggleSwitch';
import { Button } from '../../../ui/elements/buttons/Button';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { InfoTooltip } from '../../../ui/elements/feedback/InfoTooltip';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { HStack } from '../../../ui/layout/Stack/HStack';
import { LanguageSelector } from '../../../ui/layout/AppShell/LanguageSelector';
import { SaveIcon } from '../../../ui/icons';
import { changeLanguage, locale, t } from '../../../intl';
import {
  logoClearInput,
  logoSaveInput,
  parseThemeJson,
  themeClearInput,
  themeSaveInput,
} from './displayLogic';
import {
  DisplaySettings,
  UpdateDisplaySettings,
  type UpdateDisplaySettingsVariables,
} from './displaySettings.generated';

/*
 * Display settings (spec/settings/ui-surface.md § Display settings).
 *  - Language: the shared chrome language selector, reused — switching is
 *    immediate, no save step (OMS-REG-SET-01.15; the switch itself is owned by
 *    i18n).
 *  - Custom theme / Custom logo (Server Admin only): the asymmetric
 *    on-requires-Save / off-is-immediate pattern (OMS-REG-SET-01.16–01.18);
 *    the theme save gates on a shallow JSON parse (OMS-REG-SET-01.13), the
 *    logo has no validation at all (OMS-REG-SET-01.18).
 */

// One editor row (theme or logo) — same shell, different validation/effects.
const EditorToggleRow = (props: {
  heading: string;
  info?: string;
  /** Server value, once known ('' = not set). */
  saved: string | undefined;
  /** Editor seed when toggled on with nothing saved. */
  emptySeed: string;
  onSave: (text: string) => Promise<string | undefined>;
  onClear: () => Promise<void>;
  testId: string;
}) => {
  // Toggle and editor text each follow the server value until the user
  // overrides them — the same `override ?? server` idiom for both, so no effect
  // syncs a signal (kdd/solid-reactivity-pitfalls) and an in-progress edit is
  // never clobbered when the shared resource re-fetches.
  const [override, setOverride] = createSignal<boolean>();
  const [draft, setDraft] = createSignal<string>();
  const [error, setError] = createSignal<string>();
  const [busy, setBusy] = createSignal(false);

  const enabled = () => override() ?? Boolean(props.saved);
  // props.saved arrives asynchronously via the DisplaySettings resource, so a
  // saved theme/logo shows pre-filled the moment it resolves, no toggle needed
  // (OMS-REG-SET-01.16/.18).
  const text = () => draft() ?? props.saved ?? '';

  const toggle = (checked: boolean) => {
    setError(undefined);
    if (checked) {
      // Toggling ON reveals the editor pre-filled with what's in effect —
      // saving is a separate, explicit step (rules § Display settings).
      setDraft(props.saved || props.emptySeed);
      setOverride(true);
      return;
    }
    // Toggling OFF clears immediately — no Save step (OMS-REG-SET-01.17).
    setOverride(false);
    void (async () => {
      setBusy(true);
      await props.onClear();
      setBusy(false);
    })();
  };

  const save = async () => {
    setBusy(true);
    setError(await props.onSave(text()));
    setBusy(false);
  };

  return (
    <Stack gap="sm">
      <HStack gap="sm">
        <ToggleSwitch
          label={props.heading}
          checked={enabled()}
          onChange={toggle}
          disabled={busy()}
          testId={`${props.testId}-toggle`}
        />
        <Show when={props.info}>
          {info => (
            <InfoTooltip
              text={info()}
              label={props.heading}
              triggerTestId={`${props.testId}-info`}
              placement="bottom-start"
            />
          )}
        </Show>
      </HStack>
      <Show when={enabled()}>
        <TextArea
          label={props.heading}
          hideLabel
          rows={8}
          value={text()}
          onInput={e => setDraft(e.currentTarget.value)}
          disabled={busy()}
          data-testid={`${props.testId}-editor`}
        />
        <Show when={error()}>
          {message => <Alert severity="error">{message()}</Alert>}
        </Show>
        <HStack justify="end" gap="md">
          <Button
            icon={<SaveIcon />}
            loading={busy()}
            onClick={() => void save()}
            data-testid={`${props.testId}-save`}
          >
            {t('button.save')}
          </Button>
        </HStack>
      </Show>
    </Stack>
  );
};

export const DisplaySettingsSection = () => {
  // Current server values. Empty hashes → the server returns whatever is set.
  // Read via the .state gate, never suspending — this section lives inside an
  // already-open page (kdd/solid-reactivity-pitfalls § no remounts).
  const [settingsData, { refetch }] = createResource(async () => {
    const result = await graphqlFetch(DisplaySettings, {
      input: { logo: '', theme: '' },
    });
    return result.kind === 'success' ? result.data.displaySettings : undefined;
  });
  const settings = () =>
    settingsData.state === 'ready' || settingsData.state === 'refreshing'
      ? settingsData.latest
      : undefined;

  const update = async (
    input: UpdateDisplaySettingsVariables['input']
  ): Promise<string | undefined> => {
    const result = await graphqlFetch(UpdateDisplaySettings, { input });
    if (result.kind !== 'success') return undefined; // handled globally
    const payload = result.data.updateDisplaySettings;
    if (payload.__typename === 'UpdateDisplaySettingsError')
      return payload.error;
    await refetch();
    return undefined;
  };

  // Theme: refuse invalid JSON client-side with the parse error
  // (OMS-REG-SET-01.13); a successful save applies the theme by reloading the
  // whole app (OMS-REG-SET-01.16).
  const saveTheme = async (text: string): Promise<string | undefined> => {
    const parsed = parseThemeJson(text);
    if (!parsed.ok) return `${t('error.something-wrong')} ${parsed.message}`;
    const error = await update(themeSaveInput(text));
    if (error === undefined) location.reload();
    return error;
  };

  // Clearing does not itself reload the app (OMS-REG-SET-01.17).
  const clearTheme = async () => {
    await update(themeClearInput());
  };

  // Logo: no content validation at all (OMS-REG-SET-01.18); no reload either
  // way.
  const saveLogo = (text: string) => update(logoSaveInput(text));
  const clearLogo = async () => {
    await update(logoClearInput());
  };

  return (
    <Stack>
      <FieldRow label={t('button.language')}>
        <LanguageSelector
          language={locale()}
          onSelect={v => void changeLanguage(v)}
          testId="settings-language"
        />
      </FieldRow>
      <Show when={hasPermission('SERVER_ADMIN')}>
        <EditorToggleRow
          heading={t('heading.custom-theme')}
          saved={settings()?.customTheme?.value ?? ''}
          // Empty JSON object when nothing is saved (rules § Display
          // settings, D52 — this app has no built-in theme document).
          emptySeed={'{\n}\n'}
          onSave={saveTheme}
          onClear={clearTheme}
          testId="custom-theme"
        />
        <EditorToggleRow
          heading={t('heading.custom-logo')}
          info={t('heading.custom-logo-info')}
          saved={settings()?.customLogo?.value ?? ''}
          emptySeed=""
          onSave={saveLogo}
          onClear={clearLogo}
          testId="custom-logo"
        />
      </Show>
    </Stack>
  );
};
