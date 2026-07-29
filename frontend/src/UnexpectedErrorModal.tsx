import { Show, type Component } from 'solid-js';
import {
  clearForbiddenError,
  forbiddenError,
  unexpectedError,
} from './api/graphql';
import { authUser } from './auth/authContext';
import { humanisePermission } from './auth/permissionLabels';
import { t } from './intl';
import { Dialog } from './ui/elements/feedback/Dialog';
import { Button } from './ui/elements/buttons/Button';
import { AlertCircleIcon, LockIcon } from './ui/icons';

// Spec (Unexpected API Errors + Permission denied): one global modal, on top of
// everything else, for the two failure classes the query method routes here.
// The flow that hit the error stays in its loading phase either way.
//
// - Unexpected error: the description, and up to two recovery actions that are
//   each a full-page navigation (reload in place, or go to the root/dashboard) —
//   the app restarts from a clean state, so the modal is not otherwise
//   dismissable. The Dashboard action only appears once the user is
//   authenticated and operational (authUser is set): during startup, on the
//   initialisation screen, and on the login screen there is no dashboard to
//   reach, and reloading via Dashboard would only wipe entered credentials
//   (issue #519.1) — so those phases show Try again alone.
// - Permission denied (Forbidden): the user is authenticated but lacks the
//   permission. Nothing is broken, so recovery is NOT a reload — the modal
//   names the missing permission(s) and its single OK just clears the signal,
//   leaving the user where they were. Takes precedence when both are set.
export const UnexpectedErrorModal: Component = () => (
  <Show when={forbiddenError()} fallback={<UnexpectedError />} keyed>
    {permissions => <PermissionDenied permissions={permissions} />}
  </Show>
);

const PermissionDenied: Component<{ permissions: string[] }> = props => {
  // List the humanised names; when none could be parsed from the wire, a
  // generic line ("You do not have permission to do that.").
  const description = () =>
    props.permissions.length > 0
      ? t('error.permission-denied.detail', {
          permissions: props.permissions.map(humanisePermission).join(', '),
        })
      : t('error.permission-denied.generic');

  return (
    <Dialog
      open
      dismissable={false}
      onClose={() => {}}
      title={t('auth.permission-denied')}
      icon={<LockIcon />}
      description={description()}
      actions={
        <Button variant="secondary" onClick={clearForbiddenError}>
          {t('button.ok')}
        </Button>
      }
    />
  );
};

const UnexpectedError: Component = () => (
  <Dialog
    open={Boolean(unexpectedError())}
    dismissable={false}
    onClose={() => {}}
    title={t('error.something-wrong')}
    icon={<AlertCircleIcon />}
    description={unexpectedError()}
    actions={
      <>
        <Button
          variant="secondary"
          data-testid="unexpected-error-retry"
          onClick={() => location.reload()}
        >
          {t('button.try-again')}
        </Button>
        <Show when={authUser()}>
          <Button
            variant="secondary"
            data-testid="unexpected-error-dashboard"
            onClick={() => (location.href = import.meta.env.BASE_URL)}
          >
            {t('button.dashboard')}
          </Button>
        </Show>
      </>
    }
  />
);
