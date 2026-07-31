import { createSignal, createUniqueId, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { authUser, login, reLoginRequired } from './authContext';
import { submitStateAfter, type SubmitState } from './submitState';
import { Dialog } from '../ui/elements/feedback/Dialog';
import { TextField } from '../ui/elements/inputs/TextField';
import { PasswordField } from '../ui/elements/inputs/PasswordField';
import { Button } from '../ui/elements/buttons/Button';
import { Alert } from '../ui/elements/feedback/Alert';
import { t } from '../intl';
import styles from '../ui/styles/shared.module.css';

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
        values().username.trim() === '' ? t('error.username-required') : '',
      password:
        values().password.trim() === '' ? t('error.password-required') : '',
    };
    setFieldErrors(errors);
    if (errors.username !== '' || errors.password !== '') return;
    setSubmitState({ kind: 'submitting' });
    const result = await login(values().username, values().password);
    // Success closes the modal reactively (this component unmounts); a rejected
    // login shows inline; a globally-handled failure just releases the
    // submitting state — otherwise the only control out of a non-dismissable
    // modal stays disabled on "Logging in…" for good.
    setSubmitState(submitStateAfter(result));
  };

  return (
    <Dialog
      open
      dismissable={false}
      onClose={() => {}}
      testId="re-login-modal"
      title={t('heading.login-again')}
      actions={
        <Button
          type="submit"
          form={formId}
          data-testid="re-login-button"
          disabled={submitting()}
        >
          {submitting() ? t('button.logging-in') : t('button.login')}
        </Button>
      }
    >
      <form id={formId} class={styles.stack} onSubmit={e => void submit(e)}>
        <TextField
          label={t('heading.username')}
          width="full"
          name="username"
          data-testid="re-login-username-input"
          autocomplete="username"
          value={values().username}
          error={fieldErrors().username || undefined}
          onInput={e => {
            const username = e.currentTarget.value;
            setValues(previous => ({ ...previous, username }));
          }}
        />
        <PasswordField
          label={t('heading.password')}
          width="full"
          name="password"
          data-testid="re-login-password-input"
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
