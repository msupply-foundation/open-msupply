import {
  createMemo,
  createSignal,
  Show,
  type Component,
  type JSX,
} from 'solid-js';
import { t } from '../../../../intl';
import { Button } from '../../../../ui/elements/buttons/Button';
import { SplitButton } from '../../../../ui/elements/buttons/SplitButton';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { ContentFooterActions } from '../../../../ui/layout/ContentFooter/ContentFooterActions';
import {
  ArrowRightIcon,
  CheckIcon,
  InfoIcon,
  XCircleIcon,
} from '../../../../ui/icons';
import {
  CLIENT_SETTABLE,
  STATUS_LABELS,
  STATUS_LABEL_KEYS,
  statusIndex,
  isEditable,
  type SettableStatus,
} from '../../outboundStatus';
import { allowedStatuses } from '../../outboundStatusOptions';
import { changeShipmentStatus, type OutboundNode } from '../outboundUpdate';

// The status-change split button + its dialogs (spec S3 § status footer,
// kdd/action-modal): primary action "Confirm ‹next status›", options = every
// allowed next status with earlier ones disabled; hidden entirely when
// read-only. ONE client pre-flight guard (ui-standards/validation.md — the
// sanctioned lineless server gap): no lines / only placeholder lines →
// notice, no server call (OMS-REG-DIST-04.16). The pre-flight answers are
// whole-shipment SERVER probes supplied by the view (the lines are
// server-paginated — the loaded page can't answer for the shipment), run
// sequentially when the button is invoked. Everything else submits and surfaces
// the server's verdict inline in the confirmation dialog — on-hold
// (OMS-REG-DIST-02.10) and unallocated-placeholder (OMS-REG-DIST-03.9)
// rejections land in the error phase; the confirmation itself carries the
// zero-quantity removal warning (OMS-REG-DIST-04.15). The on-hold notice is
// ACTIONABLE (D59): it offers "Release hold and confirm ‹status›" — one save
// carrying both the release and the advance (rules.md § on hold,
// OMS-REG-DIST-02.27) — instead of the old app's dead-end toast.

/** Whole-shipment pre-flight answers (probed at action time, never derived
 * from the loaded page). */
export interface StatusPreflight {
  hasLines: boolean;
  hasOnlyPlaceholders: boolean;
  zeroQuantityItems: string[];
}

export interface StatusChangeActionProps {
  storeId: string;
  node: OutboundNode;
  /** Probe the shipment's pre-flight state; undefined = probe failed (the
   * global error modal is already up) → the open aborts. */
  preflight: () => Promise<StatusPreflight | undefined>;
  onSaved: (node: OutboundNode) => void;
  /** The Close button, rendered inside the footer's action cluster. */
  closeButton?: JSX.Element;
}

type Phase = 'confirm' | 'working';

export const StatusChangeAction: Component<StatusChangeActionProps> = props => {
  // pendingStatus != null opens the confirm dialog; infoMessage the lineless
  // blocking notice (the OMS-REG-DIST-04.16 server gap).
  const [pendingStatus, setPendingStatus] = createSignal<
    SettableStatus | undefined
  >();
  const [infoMessage, setInfoMessage] = createSignal<string | undefined>();
  const [phase, setPhase] = createSignal<Phase>('confirm');
  // Set when the notice is the ON-HOLD rejection: the status the user tried
  // to reach, offered as "Release hold and confirm ‹status›" — one save that
  // both releases and advances (OMS-REG-DIST-02.27, D59). Cleared with the
  // notice.
  const [holdRetryStatus, setHoldRetryStatus] = createSignal<
    SettableStatus | undefined
  >();
  const [releasing, setReleasing] = createSignal(false);

  const editable = () => isEditable(props.node.status);
  const currentIndex = () => statusIndex(props.node.status);

  // Options: the client-settable statuses the preference allows, earlier ones
  // shown disabled (spec: "options = every allowed next status, earlier
  // statuses shown disabled"; OMS-REG-DIST-04.22 limits the set).
  const statusOptions = createMemo(() =>
    CLIENT_SETTABLE.filter(status => allowedStatuses().includes(status)).map(
      status => ({
        value: status,
        label: t('button.save-and-confirm-status', {
          status: STATUS_LABELS[status],
        }),
        disabled: statusIndex(status) <= currentIndex(),
      })
    )
  );

  // The next reachable status — the DEFAULT primary action.
  const nextStatus = (): SettableStatus | undefined =>
    statusOptions().find(option => !option.disabled)?.value;

  // A menu pick overrides the primary action (select-only — the main button
  // then confirms the picked status, spec S3 § status footer). The override
  // only holds while it's still a legal forward move; a status advance
  // invalidates it and the default (next status) takes back over.
  const [picked, setPicked] = createSignal<SettableStatus | undefined>();
  const selectedStatus = (): SettableStatus | undefined => {
    const override = picked();
    if (
      override &&
      statusOptions().some(o => o.value === override && !o.disabled)
    )
      return override;
    return nextStatus();
  };

  // The zero-quantity item names from the LAST probe — rendered in the
  // confirmation's removal warning (OMS-REG-DIST-04.15).
  const [zeroQuantityItems, setZeroQuantityItems] = createSignal<string[]>([]);
  // Guards double-invocation while the probe's sequential fetches run.
  const [probing, setProbing] = createSignal(false);

  const openConfirm = async (status: string) => {
    if (!editable() || probing()) return;
    // The one sanctioned pre-flight (validation.md): no lines (or only
    // placeholders) — the server would ACCEPT a lineless confirmation
    // (captured server gap, OMS-REG-DIST-04.16), so the notice is the only
    // guard. Probed whole-shipment at click time; a failed probe already raised
    // the global error modal, so just abort.
    setProbing(true);
    const flight = await props.preflight();
    setProbing(false);
    if (!flight) return;
    if (!flight.hasLines || flight.hasOnlyPlaceholders) {
      setInfoMessage(t('messages.no-lines'));
      return;
    }
    setZeroQuantityItems(flight.zeroQuantityItems);
    setPhase('confirm');
    setPendingStatus(status as SettableStatus);
  };

  const close = () => setPendingStatus(undefined);

  const run = async () => {
    const status = pendingStatus();
    if (!status || phase() !== 'confirm') return;
    setPhase('working');
    const result = await changeShipmentStatus(
      props.storeId,
      props.node.id,
      status
    );
    if (result.kind === 'failed') return close();
    if (result.kind === 'error') {
      // The server's verdict (on hold, unallocated placeholders, reverse —
      // the client never pre-checks these, validation.md): the confirmation
      // closes (it holds no input to preserve, so D20's stay-open rationale
      // doesn't apply) and the verdict surfaces as the footer's blocking
      // notice — the same surface, still never a toast. The shared suite
      // pins this close-then-notice shape. The on-hold verdict additionally
      // arms the notice's release-and-advance action (OMS-REG-DIST-02.27, D59).
      close();
      setHoldRetryStatus(result.heldShipment ? status : undefined);
      setInfoMessage(result.message);
      return;
    }
    // Saved: reflect the node and close — closure plus the footer's advanced
    // crumbs/split button ARE the confirmation (controls › action feedback);
    // a lingering modal would block the next lifecycle step.
    props.onSaved(result.node);
    close();
  };

  const closeNotice = () => {
    setInfoMessage(undefined);
    setHoldRetryStatus(undefined);
  };

  // The on-hold notice's action (OMS-REG-DIST-02.27, D59): retry the SAME
  // status change with the hold released in one save — {id, status, onHold:
  // false}.
  const releaseAndConfirm = async () => {
    const status = holdRetryStatus();
    if (!status || releasing()) return;
    setReleasing(true);
    const result = await changeShipmentStatus(
      props.storeId,
      props.node.id,
      status,
      true
    );
    setReleasing(false);
    if (result.kind === 'failed') return closeNotice();
    if (result.kind === 'error') {
      // A fresh verdict (e.g. a racing edit) replaces the notice; the retry
      // is not re-armed — a second rejection needs a fresh attempt.
      setHoldRetryStatus(undefined);
      setInfoMessage(result.message);
      return;
    }
    props.onSaved(result.node);
    closeNotice();
  };

  return (
    <>
      <ContentFooterActions>
        {props.closeButton}
        <Show when={editable() && selectedStatus()}>
          {selected => (
            <SplitButton
              icon={<ArrowRightIcon />}
              testId="status-change-button"
              options={statusOptions()}
              value={selected()}
              menuSelectsOnly
              onValueChange={value => setPicked(value as SettableStatus)}
              onAction={status => void openConfirm(status)}
              menuLabel={t('button.confirm')}
            />
          )}
        </Show>
      </ContentFooterActions>

      {/* Confirm → working → success — mounted only while open, so its
          confirmation-modal test hook never coexists with another dialog's.
          Zero-quantity rows add the removal warning to the confirmation
          (OMS-REG-DIST-04.15); proceeding lets the server trim them. */}
      <Show when={pendingStatus() != null}>
        <Dialog
          open
          dismissable={phase() !== 'working'}
          onClose={close}
          icon={<ArrowRightIcon />}
          testId="confirmation-modal"
          title={t('heading.are-you-sure')}
          description={
            <>
              {t('messages.confirm-status-as', {
                status: pendingStatus()
                  ? t(STATUS_LABEL_KEYS[pendingStatus()!])
                  : '',
              })}
              <Show when={zeroQuantityItems().length > 0}>
                <Alert severity="warning">
                  {t('messages.confirm-zero-quantity-status', {
                    items: zeroQuantityItems().join(', '),
                  })}
                </Alert>
              </Show>
            </>
          }
          actions={
            <>
              <Show when={phase() === 'confirm'}>
                <Button
                  variant="secondary"
                  icon={<XCircleIcon />}
                  onClick={close}
                >
                  {t('button.cancel')}
                </Button>
              </Show>
              <Button
                variant="primary"
                icon={<ArrowRightIcon />}
                data-testid="confirmation-modal-ok"
                loading={phase() === 'working'}
                onClick={() => void run()}
              >
                {t('button.ok')}
              </Button>
            </>
          }
        />
      </Show>

      {/* Blocking notice: the lineless pre-flight (guards 1–2) and server
          verdicts. The ON-HOLD verdict is actionable (OMS-REG-DIST-02.27, D59): alongside
          OK it offers "Release hold and confirm ‹status›" — one save carrying
          both the release and the advance. */}
      <Show when={infoMessage() != null}>
        <Dialog
          open
          dismissable={!releasing()}
          onClose={closeNotice}
          icon={<InfoIcon />}
          title={t('heading.cannot-do-that')}
          description={infoMessage()}
          actions={
            <>
              <Button
                variant="secondary"
                icon={<CheckIcon />}
                disabled={releasing()}
                onClick={closeNotice}
              >
                {t('button.ok')}
              </Button>
              <Show when={holdRetryStatus()}>
                {retry => (
                  <Button
                    variant="primary"
                    icon={<ArrowRightIcon />}
                    data-testid="release-hold-and-confirm-button"
                    loading={releasing()}
                    onClick={() => void releaseAndConfirm()}
                  >
                    {t('button.release-hold-and-confirm-status', {
                      status: STATUS_LABELS[retry()],
                    })}
                  </Button>
                )}
              </Show>
            </>
          }
        />
      </Show>
    </>
  );
};
