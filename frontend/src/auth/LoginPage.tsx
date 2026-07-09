import { createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { login } from './authContext';
import { TextField } from '../components/ui/TextField';
import { Button } from '../components/ui/Button';
import { ArrowRightIcon, MSupplyGuyLogo } from '../components/icons';
import { LanguageSelector } from '../components/layout/AppShell/LanguageSelector';
import { changeLanguage, locale, t } from '../intl';
import styles from './Login.module.css';

type SubmitState = { kind: 'idle' } | { kind: 'submitting' } | { kind: 'error'; message: string };

// The login screen: the design-system Login (gradient hero + form panel,
// recreated from the current app — see DECISIONS.md 2026-07-08) composed with
// the real auth flow (login()). The form controls are the library TextField /
// Button; the footer language selector drives real i18n. Success needs no
// callback — login() sets the user signal and the app (App.tsx) reacts,
// continuing to the preserved destination URL (spec, Startup Flow). Document
// dir/lang is owned once by App.tsx.
export const LoginPage: Component = () => {
  const [username, setUsername] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [fieldErrors, setFieldErrors] = createSignal({ username: '', password: '' });
  const [submitState, setSubmitState] = createSignal<SubmitState>({ kind: 'idle' });

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
    if (result.kind === 'error') setSubmitState({ kind: 'error', message: result.message });
  };

  return (
    <div class={styles.page}>
      <section class={styles.hero} aria-label="About Open mSupply">
        <h1 class={styles.heroHeading}>
          {'Simple.\nPowerful.\nPharmaceutical\nManagement.'}
        </h1>
        <p class={styles.heroBody}>
          Welcome to Open mSupply. Your partner for managing health supply chains and improving
          medicine availability.
        </p>
      </section>

      <main class={styles.panel}>
        <div class={styles.formArea}>
          <form class={styles.form} aria-label={t('login.title')} onSubmit={submit}>
            <MSupplyGuyLogo class={styles.logo} />
            <TextField
              label={t('login.username')}
              width="full"
              name="username"
              autocomplete="username"
              autofocus
              value={username()}
              error={fieldErrors().username || undefined}
              onInput={(e) => setUsername(e.currentTarget.value)}
            />
            <TextField
              label={t('login.password')}
              width="full"
              type="password"
              name="password"
              autocomplete="current-password"
              value={password()}
              error={fieldErrors().password || undefined}
              onInput={(e) => setPassword(e.currentTarget.value)}
            />
            <Show when={submitError()}>
              <p class={styles.error} role="alert">
                {submitError()}
              </p>
            </Show>
            <div class={styles.buttonRow}>
              <Button
                type="submit"
                icon={<ArrowRightIcon />}
                iconPosition="end"
                disabled={submitting()}
              >
                {submitting() ? t('login.submitting') : t('login.submit')}
              </Button>
            </div>
          </form>
        </div>
        <footer class={styles.panelFooter}>
          <p class={styles.version}>
            <strong>App version</strong> 0.0.0
          </p>
          <LanguageSelector language={locale()} onSelect={(v) => void changeLanguage(v)} />
        </footer>
      </main>
    </div>
  );
};
