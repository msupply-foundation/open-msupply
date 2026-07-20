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
  statusIndex,
  isEditable,
  type SettableStatus,
} from '../../outboundStatus';
import { allowedStatuses } from '../../outboundPreferencesResource';
import { changeShipmentStatus, type OutboundNode } from '../outboundUpdate';

// The status-change split button + its dialogs (spec S3 § status footer,
// kdd/action-modal): primary action "Confirm ‹next status›", options = every
// allowed next status with earlier ones disabled; hidden entirely when
// read-only. ONE client pre-flight guard (ui-standards/validation.md — the
// sanctioned lineless server gap): no lines / only placeholder lines →
// notice, no server call (AC-S6). Everything else submits and surfaces the
// server's verdict inline in the confirmation dialog — on-hold (AC-H1) and
// unallocated-placeholder (AC-P3) rejections land in the error phase; the
// confirmation itself carries the zero-quantity removal warning (AC-S5).

export interface StatusChangeActionProps {
  storeId: string;
  node: OutboundNode;
  hasLines: boolean;
  hasOnlyPlaceholders: boolean;
  zeroQuantityItems: string[];
  onSaved: (node: OutboundNode) => void;
  /** The Close button, rendered inside the footer's action cluster. */
  closeButton?: JSX.Element;
}

type Phase = 'confirm' | 'working';

export const StatusChangeAction: Component<StatusChangeActionProps> = props => {
  // pendingStatus != null opens the confirm dialog; infoMessage the lineless
  // blocking notice (the AC-S6 server gap).
  const [pendingStatus, setPendingStatus] = createSignal<
    SettableStatus | undefined
  >();
  const [infoMessage, setInfoMessage] = createSignal<string | undefined>();
  const [phase, setPhase] = createSignal<Phase>('confirm');

  const editable = () => isEditable(props.node.status);
  const currentIndex = () => statusIndex(props.node.status);

  // Options: the client-settable statuses the preference allows, earlier ones
  // shown disabled (spec: "options = every allowed next status, earlier
  // statuses shown disabled"; AC-PR1 limits the set).
  const statusOptions = createMemo(() =>
    CLIENT_SETTABLE.filter(status => allowedStatuses().includes(status)).map(
      status => ({
        value: status,
        label: t('outbound.status-change.label', {
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

  const openConfirm = (status: string) => {
    if (!editable()) return;
    // The one sanctioned pre-flight (validation.md): no lines (or only
    // placeholders) — the server would ACCEPT a lineless confirmation
    // (captured server gap, AC-S6), so the notice is the only guard.
    if (!props.hasLines || props.hasOnlyPlaceholders) {
      setInfoMessage(t('outbound.status-change.no-lines'));
      return;
    }
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
      // pins this close-then-notice shape.
      close();
      setInfoMessage(result.message);
      return;
    }
    // Saved: reflect the node and close — closure plus the footer's advanced
    // crumbs/split button ARE the confirmation (controls › action feedback);
    // a lingering modal would block the next lifecycle step.
    props.onSaved(result.node);
    close();
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
              onAction={openConfirm}
              menuLabel={t('outbound.status-change.title')}
            />
          )}
        </Show>
      </ContentFooterActions>

      {/* Confirm → working → success — mounted only while open, so its
          confirmation-modal test hook never coexists with another dialog's.
          Zero-quantity rows add the removal warning to the confirmation
          (AC-S5); proceeding lets the server trim them. */}
      <Show when={pendingStatus() != null}>
        <Dialog
          open
          dismissable={phase() !== 'working'}
          onClose={close}
          icon={<ArrowRightIcon />}
          testId="confirmation-modal"
          title={t('outbound.status-change.confirm-title')}
          description={
            <>
              {t('outbound.status-change.confirm', {
                status: pendingStatus() ? STATUS_LABELS[pendingStatus()!] : '',
              })}
              <Show when={props.zeroQuantityItems.length > 0}>
                <Alert severity="warning">
                  {t('outbound.status-change.zero-warning', {
                    items: props.zeroQuantityItems.join(', '),
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
                  {t('common.cancel')}
                </Button>
              </Show>
              <Button
                variant="primary"
                icon={<ArrowRightIcon />}
                data-testid="confirmation-modal-ok"
                loading={phase() === 'working'}
                onClick={() => void run()}
              >
                {t('common.ok')}
              </Button>
            </>
          }
        />
      </Show>

      {/* Blocking notice (guards 1–2): unallocated placeholders / no lines. */}
      <Show when={infoMessage() != null}>
        <Dialog
          open
          onClose={() => setInfoMessage(undefined)}
          icon={<InfoIcon />}
          title={t('outbound.status-change.blocked-title')}
          description={infoMessage()}
          actions={
            <Button
              variant="secondary"
              icon={<CheckIcon />}
              onClick={() => setInfoMessage(undefined)}
            >
              {t('common.ok')}
            </Button>
          }
        />
      </Show>
    </>
  );
};
