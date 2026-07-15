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
// Shared by every action (bulk selection actions + finalise) — the phase machine is action-agnostic.
// One discriminated signal, not a phase enum + a loose error payload: the error's message + lineIds
// live ON the error state, so they can't drift out of sync with the phase (no empty Alert, no stale
// ids). Illegal states — an 'error' with no message, a 'success' carrying lineIds — are unrepresentable.
type State =
  | { phase: 'confirm' }
  | { phase: 'working' }
  | { phase: 'success' }
  | { phase: 'error'; message: string; lineIds: string[] };

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
 * ActionModal — a confirm → working → success | error state machine over <Dialog>, the shared
 * shape for any action that confirms, runs a mutation, and may report per-line errors: the
 * stocktake detail-view bulk actions (delete lines / change location / reduce to 0) AND the
 * finalise action. Not selection-specific despite its origins — the machine knows nothing about
 * selection; a caller supplies the confirm body, run(), and success message. A domain widget
 * (kdd/domain-modules): it knows the app's action-result shape but is composed from the pure ui/
 * Dialog. Same UX as the stocktakes-list delete dialog: the confirm body (with any picker) shows
 * first; the confirm button goes into a loading state while run() is in flight (the dialog is
 * blocking then — no scrim/Escape exit); then it lands on a success message, or an error phase
 * showing the server-mapped description with Cancel + "Show error lines" (which applies the errors
 * filter so the user lands on the offending rows). run() returns an ActionResult; a transport/
 * unexpected failure is handled globally (graphqlFetch), so run() resolves to `ok` there and the
 * modal simply closes — no stuck loading.
 *
 * Mount-on-open: the stateful machine lives in <Content>, mounted only while `open`. Closing
 * unmounts it, so the phase state is fresh on every open by construction — no manual reset, and a
 * late-resolving run() from a prior opening lands on a disposed scope (its setState is a no-op),
 * so there is no stale-result race to guard against. Dialog has no exit animation, so unmounting
 * immediately cuts nothing.
 */
export const ActionModal = (props: ActionModalProps): JSX.Element => (
  <Show when={props.open}>
    <Content {...props} />
  </Show>
);

const Content = (props: ActionModalProps): JSX.Element => {
  const [state, setState] = createSignal<State>({ phase: 'confirm' });
  const phase = () => state().phase;

  const runAction = async () => {
    // Re-entry guard (#double-submit): only fire from confirm, so a fast double-click before the
    // loading state paints can't launch the bulk mutation twice.
    if (phase() !== 'confirm') return;
    setState({ phase: 'working' });
    const result = await props.run();
    if (result.kind === 'ok') {
      setState({ phase: 'success' });
    } else {
      setState({ phase: 'error', message: result.message, lineIds: result.lineIds });
    }
  };

  return (
    <Dialog
      open
      dismissable={phase() !== 'working'}
      onClose={props.onClose}
      icon={props.icon}
      title={props.title}
      description={
        // The body switches on the discriminated state: error → Alert (message off the same
        // value), success → the success message, else the caller's confirm body.
        <Show
          when={errorState(state())}
          fallback={phase() === 'success' ? props.successMessage : props.children}
          keyed
        >
          {err => <Alert severity="error">{err.message}</Alert>}
        </Show>
      }
      actions={
        <Switch
          fallback={
            // confirm / working: Cancel (hidden while working) + the loading confirm button.
            <>
              <Show when={phase() === 'confirm'}>
                <Button variant="secondary" icon={<XCircleIcon />} onClick={() => props.onClose()}>
                  {t('common.cancel')}
                </Button>
              </Show>
              <Button
                variant="primary"
                icon={props.confirmIcon}
                loading={phase() === 'working'}
                onClick={() => void runAction()}
              >
                {props.confirmLabel}
              </Button>
            </>
          }
        >
          <Match when={phase() === 'success'}>
            <Button variant="secondary" icon={<CheckIcon />} onClick={() => props.onClose()}>
              {t('common.ok')}
            </Button>
          </Match>
          {/* Error phase: read the error state ONCE, keyed, so message + lineIds come from the
              same discriminated value — they can't drift apart. */}
          <Match when={errorState(state())} keyed>
            {err => (
              <>
                <Button variant="secondary" icon={<XCircleIcon />} onClick={() => props.onClose()}>
                  {t('common.cancel')}
                </Button>
                <Show when={err.lineIds.length > 0}>
                  <Button
                    variant="primary"
                    icon={<SearchIcon />}
                    onClick={() => {
                      // Capture ids before closing (unmount disposes the state) — order matters.
                      const ids = err.lineIds;
                      props.onClose();
                      props.onShowErrors(ids);
                    }}
                  >
                    {t('stocktake.errors.show')}
                  </Button>
                </Show>
              </>
            )}
          </Match>
        </Switch>
      }
    />
  );
};

// Narrow the state to its error branch (or undefined) — lets the error <Match> read message +
// lineIds off one keyed value rather than re-deriving them with optional chaining.
const errorState = (s: State): Extract<State, { phase: 'error' }> | undefined =>
  s.phase === 'error' ? s : undefined;
