import { createSignal, Match, Show, Switch, type JSX } from 'solid-js';
import { t } from '../../intl';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import { Alert } from '../../ui/elements/feedback/Alert';
import { Button } from '../../ui/elements/buttons/Button';
import { CheckIcon, XCircleIcon, SearchIcon } from '../../ui/icons';

// The result an ActionModal's run() reports back, which drives the phase:
//  - ok       → the success phase (message + OK).
//  - error    → the error phase: the server-mapped message, a Cancel, and — when it carries
//               offending line ids — a "Show error lines" button that hands them to onShowErrors.
export type ActionResult =
  | { kind: 'ok' }
  | { kind: 'error'; message: string; lineIds: string[] };

// confirm → working → success | error. Matches the stocktakes-list delete dialog (kdd/action-modal).
type Phase = 'confirm' | 'working' | 'success' | 'error';

export interface ActionModalProps {
  open: boolean;
  /** Every close path — Cancel / OK / scrim / Escape. Blocked while working. */
  onClose: () => void;
  icon?: JSX.Element;
  title: string;
  /** The confirm-phase body (question + any inputs like a picker). */
  children: JSX.Element;
  /** The confirm button: its label + icon. */
  confirmLabel: string;
  confirmIcon?: JSX.Element;
  /** Runs the action; its ActionResult drives the phase (working → success | error). */
  run: () => Promise<ActionResult>;
  /** Success-phase message. */
  successMessage: string;
  /** Error phase's "Show error lines": apply the errors filter to the offending lines. */
  onShowErrors: (lineIds: string[]) => void;
}

/*
 * ActionModal — a confirm → working → success | error state machine over <Dialog>, the shared shape
 * for the stocktake detail-view bulk actions (delete lines / change location / reduce to 0). Same
 * UX as the stocktakes-list delete dialog: the confirm body (with any picker) shows first; the
 * confirm button goes into a loading state while run() is in flight (the dialog is blocking then —
 * no scrim/Escape exit); then it lands on a success message, or an error phase showing the
 * server-mapped description with Cancel + "Show error lines" (which applies the errors filter so
 * the user lands on the offending rows). run() returns an ActionResult; a transport/unexpected
 * failure is handled globally (graphqlFetch), so run() resolves to `ok` there and the modal simply
 * closes on success — no stuck-loading state.
 */
export const ActionModal = (props: ActionModalProps): JSX.Element => {
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [error, setError] = createSignal<{ message: string; lineIds: string[] }>();

  // Reset to the confirm phase each time the dialog (re)opens, so a reused modal never shows a
  // stale success/error from a previous run. Read props.open in JSX so this stays reactive.
  const currentPhase = (): Phase => (props.open ? phase() : 'confirm');

  const close = () => {
    props.onClose();
    setPhase('confirm');
    setError(undefined);
  };

  const runAction = async () => {
    setPhase('working');
    const result = await props.run();
    if (result.kind === 'ok') {
      setPhase('success');
    } else {
      setError({ message: result.message, lineIds: result.lineIds });
      setPhase('error');
    }
  };

  return (
    <Dialog
      open={props.open}
      dismissable={currentPhase() !== 'working'}
      onClose={close}
      icon={props.icon}
      title={props.title}
      description={
        <Switch fallback={props.children}>
          <Match when={currentPhase() === 'error'}>
            <Alert severity="error">{error()?.message}</Alert>
          </Match>
          <Match when={currentPhase() === 'success'}>{props.successMessage}</Match>
        </Switch>
      }
      actions={
        <Switch
          fallback={
            // confirm / working: Cancel (hidden while working) + the loading confirm button.
            <>
              <Show when={currentPhase() === 'confirm'}>
                <Button variant="secondary" icon={<XCircleIcon />} onClick={close}>
                  {t('common.cancel')}
                </Button>
              </Show>
              <Button
                variant="primary"
                icon={props.confirmIcon}
                loading={currentPhase() === 'working'}
                onClick={() => void runAction()}
              >
                {props.confirmLabel}
              </Button>
            </>
          }
        >
          <Match when={currentPhase() === 'success'}>
            <Button variant="secondary" icon={<CheckIcon />} onClick={close}>
              {t('common.ok')}
            </Button>
          </Match>
          <Match when={currentPhase() === 'error'}>
            <Button variant="secondary" icon={<XCircleIcon />} onClick={close}>
              {t('common.cancel')}
            </Button>
            <Show when={(error()?.lineIds.length ?? 0) > 0}>
              <Button
                variant="primary"
                icon={<SearchIcon />}
                onClick={() => {
                  const ids = error()?.lineIds ?? [];
                  close();
                  props.onShowErrors(ids);
                }}
              >
                {t('stocktake.errors.show')}
              </Button>
            </Show>
          </Match>
        </Switch>
      }
    />
  );
};
