import { createSignal, createUniqueId, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { authUser, login, reLoginRequired } from './authContext';
import { Dialog } from '../ui/elements/feedback/Dialog';
import { TextField } from '../ui/elements/inputs/TextField';
import { Button } from '../ui/elements/buttons/Button';
import { Alert } from '../ui/elements/feedback/Alert';
import { t } from '../intl';
import styles from '../ui/styles/shared.module.css';

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'error'; message: string };

// Spec (Authentication Logic): re-login modal on top of everything else,
// username prefilled but editable — the re-login may be as a different user.
// Shown for inactivity and unexpected logout; a successful login closes it
// reactively (this component unmounts, which closes the dialog). Not
// dismissable — the session is gone, so logging in is the only way forward.
export const ReLoginModal: Component = () => (
  <Show when={reLoginRequired() && authUser()} keyed>
    {user => <ReLoginForm currentUsername={user.username} />}
  </Show>
);

const ReLoginForm: Component<{ currentUsername: string }> = props => {
  const [values, setValues] = createSignal({
    username: props.currentUsername,
    password: '',
  });
  const [fieldErrors, setFieldErrors] = createSignal({
    username: '',
    password: '',
  });
  const [submitState, setSubmitState] = createSignal<SubmitState>({
    kind: 'idle',
  });
  // The submit button lives in the dialog's actions slot, outside the <form> —
  // the `form` attribute ties them together.
  const formId = createUniqueId();

  const submitting = () => submitState().kind === 'submitting';
  const submitError = () => {
    const state = submitState();
    return state.kind === 'error' ? state.message : undefined;
  };

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    // Spec: the button is always clickable; validation errors show on click.
    const errors = {
      username:
        values().username.trim() === '' ? t('login.username-required') : '',
      password:
        values().password.trim() === '' ? t('login.password-required') : '',
    };
    setFieldErrors(errors);
    if (errors.username !== '' || errors.password !== '') return;
    setSubmitState({ kind: 'submitting' });
    const result = await login(values().username, values().password);
    if (result.kind === 'error')
      setSubmitState({ kind: 'error', message: result.message });
    // 'success' closes the modal reactively; 'pending' is globally handled —
    // stay in the loading phase.
  };

  return (
    <Dialog
      open
      dismissable={false}
      onClose={() => {}}
      title={t('login.again')}
      actions={
        <Button type="submit" form={formId} disabled={submitting()}>
          {submitting() ? t('login.submitting') : t('login.submit')}
        </Button>
      }
    >
      <form id={formId} class={styles.stack} onSubmit={e => void submit(e)}>
        <TextField
          label={t('login.username')}
          width="full"
          name="username"
          autocomplete="username"
          value={values().username}
          error={fieldErrors().username || undefined}
          onInput={e => {
            const username = e.currentTarget.value;
            setValues(previous => ({ ...previous, username }));
          }}
        />
        <TextField
          label={t('login.password')}
          width="full"
          type="password"
          name="password"
          autocomplete="current-password"
          value={values().password}
          error={fieldErrors().password || undefined}
          onInput={e => {
            const password = e.currentTarget.value;
            setValues(previous => ({ ...previous, password }));
          }}
        />
        <Show when={submitError()}>
          <Alert severity="error">{submitError()}</Alert>
        </Show>
      </form>
    </Dialog>
  );
};
