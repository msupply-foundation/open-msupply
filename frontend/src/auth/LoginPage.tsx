import { createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { login } from './authContext';
import { submitStateAfter, type SubmitState } from './submitState';
import { getLastLoginUsername } from '../appData';
import { serverVersion } from '../api/serverInfo';
import { TextField } from '../ui/elements/inputs/TextField';
import { PasswordField } from '../ui/elements/inputs/PasswordField';
import { Button } from '../ui/elements/buttons/Button';
import { Alert } from '../ui/elements/feedback/Alert';
import { ArrowRightIcon } from '../ui/icons';
import { AppLogo } from '../ui/branding/AppLogo';
import { LanguageSelector } from '../ui/layout/AppShell/LanguageSelector';
import { changeLanguage, locale, t } from '../intl';
import styles from '../ui/styles/LoginInitLayout.module.css';

// The login screen: the design-system Login (gradient hero + form panel,
// recreated from the current app — see kdd/page-composition) composed with
// the real auth flow (login()). The form controls are the library TextField /
// Button; the submit failure surfaces in the library Alert; the footer language
// selector drives real i18n. Success needs no callback — login() sets the user
// signal and the app (App.tsx) reacts, continuing to the preserved destination
// URL (spec, Startup Flow). Document dir/lang is owned once by App.tsx.
export const LoginPage: Component = () => {
  // Spec (Authentication): prefilled from the device's remembered username, so
  // the returning user only retypes the password. Read once as the signal's
  // initial value — the page is remounted whenever authUser() clears, so it
  // re-reads on every return to it, and nothing here needs to be reactive.
  const remembered = getLastLoginUsername();
  const [username, setUsername] = createSignal(remembered ?? '');
  const [password, setPassword] = createSignal('');
  const [fieldErrors, setFieldErrors] = createSignal({
    username: '',
    password: '',
  });
  const [submitState, setSubmitState] = createSignal<SubmitState>({
    kind: 'idle',
  });

  const submitting = () => submitState().kind === 'submitting';
  const submitError = () => {
    const state = submitState();
    return state.kind === 'error' ? state.message : undefined;
  };

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    // Spec (Authentication Logic): the button is always clickable; validation
    // errors show on submit.
    const errors = {
      username: username().trim() === '' ? t('error.username-required') : '',
      password: password().trim() === '' ? t('error.password-required') : '',
    };
    setFieldErrors(errors);
    if (errors.username !== '' || errors.password !== '') return;
    setSubmitState({ kind: 'submitting' });
    const result = await login(username(), password());
    // Clear the password only on a rejected login (finding F6 — align with the
    // current app; a wrong password is re-entered, not left in the field). A
    // globally-handled failure reached no verdict on it, so it stays and the
    // same submit can simply be repeated.
    if (result.kind === 'error') setPassword('');
    setSubmitState(submitStateAfter(result));
  };

  return (
    <div class={styles.page}>
      <section class={styles.hero} aria-label={t('label.about-open-msupply')}>
        <h1 class={styles.heroHeading}>{t('login.heading')}</h1>
        <p class={styles.heroBody}>{t('login.body')}</p>
      </section>

      <main class={styles.panel}>
        <div class={styles.formArea}>
          <form
            class={styles.form}
            aria-label={t('button.login')}
            onSubmit={submit}
          >
            <AppLogo class={styles.logo} />
            <TextField
              label={t('heading.username')}
              width="full"
              type="text"
              name="username"
              data-testid="login-username-input"
              autocomplete="username"
              // Spec (S1): focus starts on whichever field still needs typing —
              // the username when nothing is remembered, the password when the
              // name is already filled in.
              autofocus={remembered === undefined}
              value={username()}
              error={fieldErrors().username || undefined}
              onInput={e => setUsername(e.currentTarget.value)}
              // Spec (issue #519.6): lock the fields once login is in flight so
              // the credentials being verified can't be edited mid-request.
              disabled={submitting()}
            />
            <PasswordField
              label={t('heading.password')}
              width="full"
              name="password"
              data-testid="login-password-input"
              autocomplete="current-password"
              autofocus={remembered !== undefined}
              value={password()}
              error={fieldErrors().password || undefined}
              onInput={e => setPassword(e.currentTarget.value)}
              disabled={submitting()}
            />
            <Show when={submitError()}>
              <Alert severity="error" testId="login-error">
                {submitError()}
              </Alert>
            </Show>
            <div class={styles.buttonRow}>
              <Button
                type="submit"
                icon={<ArrowRightIcon />}
                iconPosition="end"
                data-testid="login-button"
                disabled={submitting()}
              >
                {submitting() ? t('button.logging-in') : t('button.login')}
              </Button>
            </div>
          </form>
        </div>
        <footer class={styles.panelFooter}>
          {/* Sibling old UI, served at the server root /old-ui/ (dual-frontend
              transition — one cookie session spans both). A plain anchor for a
              full document navigation, NOT router navigation: it's a different
              app. The href is root-relative on purpose — /old-ui/ is a sibling
              of this app's BASE_URL mount, never nested under it (e.g. the /spec
              demo track still points at the root /old-ui/). Centered above the
              version, matching the initialisation screen's Save-log link. */}
          <a
            class={styles.switchLink}
            href="/old-ui/"
            data-testid="login-switch-to-old-ui"
          >
            {t('login.switch-to-old-ui')}
          </a>
          <p class={styles.version} data-testid="login-version">
            <strong>{t('label.app-version')}</strong> {APP_VERSION}
          </p>
          {/* Spec (App version, OMS-REG-LGN-01.20): absent until the startup pass has
              fetched it — never a placeholder. */}
          <Show when={serverVersion()}>
            <p class={styles.version}>
              <strong>{t('label.server-version')}</strong> {serverVersion()}
            </p>
          </Show>
          <div class={styles.languageRow}>
            <LanguageSelector
              language={locale()}
              onSelect={v => void changeLanguage(v)}
            />
          </div>
        </footer>
      </main>
    </div>
  );
};
