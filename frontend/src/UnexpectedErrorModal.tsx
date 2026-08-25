import { Show, type Component } from 'solid-js';
import {
  clearForbiddenError,
  clearUnexpectedError,
  forbiddenError,
  unexpectedError,
} from './api/graphql';
import { authUser } from './auth/authContext';
import { currentStoreId, currentStoreName } from './store/storeContext';
import { humanisePermission } from './auth/permissionLabels';
import { t } from './intl';
import { Dialog } from './ui/elements/feedback/Dialog';
import { ErrorDialog } from './ui/elements/feedback/ErrorDialog';
import { Button } from './ui/elements/buttons/Button';
import { LockIcon } from './ui/icons';

// Spec (Unexpected API Errors + Permission denied): one global modal, on top of
// everything else, for the two failure classes the query method routes here.
// The flow that hit the error stays in its loading phase either way.
//
// - Unexpected error: the condition-mapped error dialog (D109, ui-standards ›
//   error dialogs). Close dismisses in place — the flow behind released its
//   busy state, so the action can simply be repeated; the primary
//   (Retry / Try again) reloads the current URL in place. Go to Home is a
//   quiet tertiary affordance, only once the user is authenticated and
//   operational (authUser is set): during startup, on the initialisation
//   screen, and on the login screen there is no Home to reach, and
//   reloading via Home would only wipe entered credentials (issue
//   #519.1). An edit failure (a mutation) never offers it — leaving the
//   screen would discard the entry.
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
        // The single OK is this dialog's confirm, so Enter clears the notice
        // (spec/keyboard KB-E2).
        <Button
          variant="secondary"
          confirms="plain"
          onClick={clearForbiddenError}
        >
          {t('button.ok')}
        </Button>
      }
    />
  );
};

// The current store for the support block, e.g. "CHC Ermera (5B28…5DF9)" —
// name for the human, abbreviated id for support. Empty before a store is
// entered (startup, login), where the row is simply omitted.
const storeLabel = (): string | undefined => {
  const id = currentStoreId();
  if (!id) return undefined;
  const shortId = id.length > 12 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id;
  return `${currentStoreName()} (${shortId})`;
};

// Non-keyed <Show>: parallel calls failing together (the server going away
// mid-screen) each set the signal, and a keyed Show would tear down and
// re-show the open <dialog> per failure — focus reset, an expanded Show
// details collapsing. Non-keyed, the dialog mounts once and later failures
// update its copy in place.
const UnexpectedError: Component = () => (
  <Show when={unexpectedError()}>
    {info => (
      <ErrorDialog
        open
        condition={info().condition}
        details={{
          reference: info().reference,
          cause: info().cause,
          store: storeLabel(),
          request: info().request,
        }}
        duringEdit={info().duringEdit}
        onClose={clearUnexpectedError}
        onRetry={() => location.reload()}
        onHome={
          authUser()
            ? () => (location.href = import.meta.env.BASE_URL)
            : undefined
        }
        testId="unexpected-error-modal"
      />
    )}
  </Show>
);
