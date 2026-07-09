import { createSignal, For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { login } from './authContext';
import { FormField } from '../components/FormField';
import { changeLanguage, languageOptions, locale, t } from '../intl';
import styles from '../styles/shared.module.css';

type SubmitState = { kind: 'idle' } | { kind: 'submitting' } | { kind: 'error'; message: string };

// Spec (Authentication Logic): a basic login form. The destination URL is preserved
// because this page renders in place — after login the router continues from the
// original URL (spec, Startup Flow). Success needs no callback: login() sets the
// user, and the app reacts to that signal.
export const LoginPage: Component = () => {
  const [values, setValues] = createSignal({
    username: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = createSignal({
    username: '',
    password: '',
  });
  const [submitState, setSubmitState] = createSignal<SubmitState>({ kind: 'idle' });

  const submitting = () => submitState().kind === 'submitting';
  const submitError = () => {
    const state = submitState();
    return state.kind === 'error' ? state.message : undefined;
  };

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    // Spec: the button is always clickable; validation errors show on click.
    const errors = {
      username: values().username.trim() === '' ? t('login.username-required') : '',
      password: values().password.trim() === '' ? t('login.password-required') : '',
    };
    setFieldErrors(errors);
    if (errors.username !== '' || errors.password !== '') return;
    setSubmitState({ kind: 'submitting' });
    const result = await login(values().username, values().password);
    if (result.kind === 'error') setSubmitState({ kind: 'error', message: result.message });
  };

  return (
    <div class={styles.page}>
      <form class={styles.card} onSubmit={submit}>
        <h1>{t('login.title')}</h1>
        <FormField
          id="login-username"
          label={t('login.username')}
          value={values().username}
          onInput={username => setValues(previous => ({ ...previous, username }))}
          error={fieldErrors().username}
        />
        <FormField
          id="login-password"
          label={t('login.password')}
          type="password"
          value={values().password}
          onInput={password => setValues(previous => ({ ...previous, password }))}
          error={fieldErrors().password}
        />
        <Show when={submitError()}>
          <p class={styles.errorText}>{submitError()}</p>
        </Show>
        <button class={styles.button} type="submit" disabled={submitting()}>
          {submitting() ? t('login.submitting') : t('login.submit')}
        </button>
        {/* Language switcher — changeLanguage loads the dictionary then flips the
            locale signal, so the whole form re-renders reactively. */}
        <select
          data-testid="language-select"
          value={locale()}
          onChange={event => void changeLanguage(event.currentTarget.value)}
        >
          <For each={languageOptions}>
            {option => <option value={option.value}>{option.label}</option>}
          </For>
        </select>
      </form>
    </div>
  );
};
