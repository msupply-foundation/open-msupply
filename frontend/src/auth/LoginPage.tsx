import { createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { login } from './authContext';
import { TextField } from '../ui/elements/inputs/TextField';
import { Button } from '../ui/elements/buttons/Button';
import { Alert } from '../ui/elements/feedback/Alert';
import { ArrowRightIcon, MSupplyGuyLogo } from '../ui/icons';
import { LanguageSelector } from '../ui/layout/AppShell/LanguageSelector';
import { changeLanguage, locale, t } from '../intl';
import styles from './Login.module.css';

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'error'; message: string };

// The login screen: the design-system Login (gradient hero + form panel,
// recreated from the current app — see kdd/page-composition) composed with
// the real auth flow (login()). The form controls are the library TextField /
// Button; the submit failure surfaces in the library Alert; the footer language
// selector drives real i18n. Success needs no callback — login() sets the user
// signal and the app (App.tsx) reacts, continuing to the preserved destination
// URL (spec, Startup Flow). Document dir/lang is owned once by App.tsx.
export const LoginPage: Component = () => {
  const [username, setUsername] = createSignal('');
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
      username: username().trim() === '' ? t('login.username-required') : '',
      password: password().trim() === '' ? t('login.password-required') : '',
    };
    setFieldErrors(errors);
    if (errors.username !== '' || errors.password !== '') return;
    setSubmitState({ kind: 'submitting' });
    const result = await login(username(), password());
    if (result.kind === 'error')
      setSubmitState({ kind: 'error', message: result.message });
  };

  return (
    <div class={styles.page}>
      <section class={styles.hero} aria-label={t('login.about')}>
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
            <MSupplyGuyLogo class={styles.logo} />
            <TextField
              label={t('heading.username')}
              width="full"
              type="text"
              name="username"
              data-testid="login-username-input"
              autocomplete="username"
              autofocus
              value={username()}
              error={fieldErrors().username || undefined}
              onInput={e => setUsername(e.currentTarget.value)}
            />
            <TextField
              label={t('heading.password')}
              width="full"
              type="password"
              name="password"
              data-testid="login-password-input"
              autocomplete="current-password"
              value={password()}
              error={fieldErrors().password || undefined}
              onInput={e => setPassword(e.currentTarget.value)}
            />
            <Show when={submitError()}>
              <Alert severity="error">{submitError()}</Alert>
            </Show>
            <div class={styles.buttonRow}>
              <Button
                type="submit"
                icon={<ArrowRightIcon />}
                iconPosition="end"
                data-testid="login-button"
                disabled={submitting()}
              >
                {submitting() ? t('login.submitting') : t('button.login')}
              </Button>
            </div>
          </form>
        </div>
        <footer class={styles.panelFooter}>
          <p class={styles.version}>
            <strong>{t('login.version')}</strong> 0.0.0
          </p>
          <LanguageSelector
            language={locale()}
            onSelect={v => void changeLanguage(v)}
          />
        </footer>
      </main>
    </div>
  );
};
