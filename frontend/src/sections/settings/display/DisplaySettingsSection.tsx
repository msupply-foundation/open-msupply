import { createResource, createSignal, For, Show } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { gated } from '../../../api/gated';
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
import {
  applyCustomLogo,
  applyCustomTheme,
  clearCustomLogo,
  clearCustomTheme,
} from '../../../ui/branding/applyBranding';
import { isDarkMode, setColourScheme } from '../../../ui/styles/colourScheme';
import { changeLanguage, locale, t } from '../../../intl';
import {
  checkTheme,
  logoClearInput,
  logoSaveInput,
  themeClearInput,
  themeSaveInput,
} from './displayLogic';
import {
  DisplaySettings,
  UpdateDisplaySettings,
  type UpdateDisplaySettingsVariables,
} from '../../../api/displaySettings.generated';

/*
 * Display settings (spec/settings/ui-surface.md § Display settings).
 *  - Language: the shared chrome language selector, reused — switching is
 *    immediate, no save step (OMS-REG-SET-01.15; the switch itself is owned
 *    by i18n).
 *  - Custom theme / Custom logo (Server Admin only): the asymmetric
 *    on-requires-Save / off-is-immediate pattern (OMS-REG-SET-01.16–01.18);
 *    the theme save gates on compiling the document (OMS-REG-SET-01.13),
 *    the logo has no validation at all (OMS-REG-SET-01.18).
 */

/** What a save attempt reported back (see displayLogic.checkTheme). */
type Problems = { errors: string[]; warnings: string[] };
const NO_PROBLEMS: Problems = { errors: [], warnings: [] };

// One editor row (theme or logo) — same shell, different validation/effects.
const EditorToggleRow = (props: {
  heading: string;
  info?: string;
  /** Server value, once known ('' = not set). */
  saved: string | undefined;
  /** Editor seed when toggled on with nothing saved. */
  emptySeed: string;
  onSave: (text: string) => Promise<Problems>;
  onClear: () => Promise<void>;
  /*
   * Warnings for the text as it stands, shown while editing. A successful
   * save reloads the app, so anything only reported afterwards would never be
   * seen — the theme row's warnings have to be live to be readable at all.
   */
  liveWarnings?: (text: string) => string[];
  testId: string;
}) => {
  // Toggle and editor text each follow the server value until the user
  // overrides them — the same `override ?? server` idiom for both, so no effect
  // syncs a signal (kdd/solid-reactivity-pitfalls) and an in-progress edit is
  // never clobbered when the shared resource re-fetches.
  const [override, setOverride] = createSignal<boolean>();
  const [draft, setDraft] = createSignal<string>();
  const [problems, setProblems] = createSignal<Problems>(NO_PROBLEMS);
  const [busy, setBusy] = createSignal(false);

  const enabled = () => override() ?? Boolean(props.saved);
  // props.saved arrives asynchronously via the DisplaySettings resource, so a
  // saved theme/logo shows pre-filled the moment it resolves, no toggle needed
  // (OMS-REG-SET-01.16/.18).
  const text = () => draft() ?? props.saved ?? '';

  // Errors are only meaningful after a save attempt (half-typed JSON is not an
  // error yet); warnings describe the current text, so they are always live.
  const warnings = () => props.liveWarnings?.(text()) ?? problems().warnings;

  const toggle = (checked: boolean) => {
    setProblems(NO_PROBLEMS);
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
    setProblems(await props.onSave(text()));
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
        <Show when={problems().errors.length > 0 || warnings().length > 0}>
          <Stack gap="sm" data-testid={`${props.testId}-problems`}>
            <For each={problems().errors}>
              {message => <Alert severity="error">{message}</Alert>}
            </For>
            <For each={warnings()}>
              {message => <Alert severity="warning">{message}</Alert>}
            </For>
          </Stack>
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
  // Non-suspending read — this section lives inside an already-open page
  // (kdd/solid-reactivity-pitfalls § no remounts).
  const [settingsData, { refetch }] = createResource(async () => {
    const result = await graphqlFetch(DisplaySettings, {
      input: { logo: '', theme: '' },
    });
    return result.kind === 'success' ? result.data.displaySettings : undefined;
  });
  const settings = () => gated(settingsData);

  /** The new hash on success, so the caller can cache what it just saved. */
  const update = async (
    input: UpdateDisplaySettingsVariables['input']
  ): Promise<{ errors: string[]; hash?: string }> => {
    const result = await graphqlFetch(UpdateDisplaySettings, { input });
    if (result.kind !== 'success') return { errors: [] }; // handled globally
    const payload = result.data.updateDisplaySettings;
    if (payload.__typename === 'UpdateDisplaySettingsError')
      return { errors: [payload.error] };
    await refetch();
    return {
      errors: [],
      hash:
        (input.customTheme !== undefined ? payload.theme : payload.logo) ?? '',
    };
  };

  /*
   * Theme: refuse a document that cannot be applied, reporting every reason
   * (OMS-REG-SET-01.13); a successful save applies it by reloading the whole
   * app (OMS-REG-SET-01.16). The compiled CSS is cached before the reload so
   * the new theme is already there at first paint.
   */
  const saveTheme = async (text: string): Promise<Problems> => {
    const check = checkTheme(text);
    if (!check.ok) return { errors: check.errors, warnings: check.warnings };
    const { errors, hash } = await update(themeSaveInput(text));
    if (errors.length > 0) return { errors, warnings: check.warnings };
    applyCustomTheme(text, hash ?? '');
    location.reload();
    return NO_PROBLEMS;
  };

  // Clearing reverts in place — no reload needed (OMS-REG-SET-01.17).
  const clearTheme = async () => {
    await update(themeClearInput());
    clearCustomTheme();
  };

  // Logo: no content validation at all (OMS-REG-SET-01.18); no reload either
  // way — the logo is a signal, so every place it renders updates live.
  const saveLogo = async (text: string): Promise<Problems> => {
    const { errors, hash } = await update(logoSaveInput(text));
    if (errors.length === 0) applyCustomLogo(text, hash ?? '');
    return { errors, warnings: [] };
  };
  const clearLogo = async () => {
    await update(logoClearInput());
    clearCustomLogo();
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
          info={t('heading.custom-theme-info')}
          saved={settings()?.customTheme?.value ?? ''}
          // A one-line theme when nothing is saved: the shortest document that
          // does something, rather than an empty object to stare at.
          emptySeed={'{\n  "brand": "#0b6e99"\n}\n'}
          onSave={saveTheme}
          onClear={clearTheme}
          liveWarnings={text => checkTheme(text).warnings}
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
      {/*
        Outside the Server Admin gate on purpose: the colour scheme is a
        personal display preference held on this device, like the language
        above — not a store setting. It sits last so that, for an admin, it
        reads as the third switch in the group.
      */}
      <ToggleSwitch
        label={t('heading.dark-mode')}
        checked={isDarkMode()}
        onChange={checked => setColourScheme(checked ? 'dark' : 'light')}
        testId="dark-mode-toggle"
      />
    </Stack>
  );
};
