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
// read-only. Pre-flight guards run IN ORDER before any server call (AC-S6 and
// friends):
//   1. placeholders with quantity → blocking alert (the server would reject
//      ALLOCATED+ anyway — AC-P3 — but SHIPPED-from-NEW would silently strand
//      them, so the UI blocks first);
//   2. no lines / only placeholder lines → notice, no server call (AC-S6);
//   3. on hold → blocking notice, no server call (AC-H1's UX face);
//   4. zero-quantity rows → the confirmation carries the removal warning
//      (AC-S5);
//   5. the confirmation prompt itself.

export interface StatusChangeActionProps {
  storeId: string;
  node: OutboundNode;
  hasLines: boolean;
  hasOnlyPlaceholders: boolean;
  placeholderItemsWithQuantity: string[];
  zeroQuantityItems: string[];
  onSaved: (node: OutboundNode) => void;
  /** The Close button, rendered inside the footer's action cluster. */
  closeButton?: JSX.Element;
}

type Phase = 'confirm' | 'working' | 'error';

export const StatusChangeAction: Component<StatusChangeActionProps> = props => {
  // pendingStatus != null opens the confirm dialog; infoMessage the blocking
  // notice (guards 1–2).
  const [pendingStatus, setPendingStatus] = createSignal<
    SettableStatus | undefined
  >();
  const [infoMessage, setInfoMessage] = createSignal<string | undefined>();
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [errorMessage, setErrorMessage] = createSignal('');

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
    // Guard 1 — placeholders still holding quantity block every advance.
    if (props.placeholderItemsWithQuantity.length > 0) {
      setInfoMessage(
        t('outbound.status-change.unallocated', {
          items: props.placeholderItemsWithQuantity.join(', '),
        })
      );
      return;
    }
    // Guard 2 — no lines (or only placeholders): notice, no server call
    // (AC-S6 — the server would accept it; blocking is UI-owned).
    if (!props.hasLines || props.hasOnlyPlaceholders) {
      setInfoMessage(t('outbound.status-change.no-lines'));
      return;
    }
    // Guard 3 — on hold: status changes are blocked until released (AC-H1).
    if (props.node.onHold) {
      setInfoMessage(t('outbound.hold.blocked'));
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
      // Server-side rejection (a race the pre-flight missed, or the on-hold /
      // unallocated guard firing server-side): the dialog stays open and shows
      // the error inline (controls › dialogs, D20).
      setErrorMessage(result.message);
      setPhase('error');
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
            <Show
              when={phase() !== 'error'}
              fallback={<Alert severity="error">{errorMessage()}</Alert>}
            >
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
            </Show>
          }
          actions={
            <Show
              when={phase() !== 'error'}
              fallback={
                <Button
                  variant="secondary"
                  icon={<XCircleIcon />}
                  onClick={close}
                >
                  {t('common.cancel')}
                </Button>
              }
            >
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
            </Show>
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
