import { createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { authUser, login, reLoginRequired } from './authContext';
import { FormField } from '../components/FormField';
import { t } from '../intl';
import styles from '../styles/shared.module.css';

type SubmitState = { kind: 'idle' } | { kind: 'submitting' } | { kind: 'error'; message: string };

// Spec (Authentication Logic): re-login modal on top of everything else, username
// prefilled but editable — the re-login may be as a different user. Shown for
// inactivity and unexpected logout; a successful login closes it reactively.
export const ReLoginModal: Component = () => (
  <Show when={reLoginRequired() && authUser()} keyed>
    {(user) => <ReLoginForm currentUsername={user.username} />}
  </Show>
);

const ReLoginForm: Component<{ currentUsername: string }> = (props) => {
  const [values, setValues] = createSignal({
    username: props.currentUsername,
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
    // 'success' closes the modal reactively; 'pending' is globally handled — stay
    // in the loading phase.
  };

  return (
    <div class={styles.overlay}>
      <form class={styles.modal} onSubmit={submit}>
        <h2>{t('login.again')}</h2>
        <FormField
          id="relogin-username"
          label={t('login.username')}
          value={values().username}
          onInput={(username) => setValues((previous) => ({ ...previous, username }))}
          error={fieldErrors().username}
        />
        <FormField
          id="relogin-password"
          label={t('login.password')}
          type="password"
          value={values().password}
          onInput={(password) => setValues((previous) => ({ ...previous, password }))}
          error={fieldErrors().password}
        />
        <Show when={submitError()}>
          <p class={styles.errorText}>{submitError()}</p>
        </Show>
        <button class={styles.button} type="submit" disabled={submitting()}>
          {submitting() ? t('login.submitting') : t('login.submit')}
        </button>
      </form>
    </div>
  );
};
