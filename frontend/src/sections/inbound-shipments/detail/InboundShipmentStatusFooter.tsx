import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import { CheckboxButton } from '../../../ui/elements/buttons/CheckboxButton';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { StatusIndicator } from '../../../ui/elements/feedback/StatusIndicator';
import { SplitButton } from '../../../ui/elements/buttons/SplitButton';
import { IconButton } from '../../../ui/elements/buttons/IconButton';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { ArrowRightIcon, CloseIcon } from '../../../ui/icons';
import type { InboundInfoFragment } from './inboundShipmentDetail.generated';
import { updateInboundShipment } from './inboundShipmentUpdate';
import {
  kindOf,
  reachableStatuses,
  statusDatetime,
  statusFlow,
  statusIndex,
  STATUS_LABELS,
} from './inboundShipmentStatus';

export interface InboundShipmentStatusFooterProps {
  storeId: string;
  node: InboundInfoFragment;
  /**
   * True once Verified — no status change (and Hold is disabled). Gated on
   * `canChangeStatus`, NOT the shipment's edit gate: a Shipped shipment is
   * read-only for edits but must still advance to Delivered.
   */
  disabled: boolean;
  /** Which update twin the advance writes through — the route's scope. */
  isExternal: boolean;
  onSetHold: (hold: boolean) => void;
  /**
   * A status advance committed — the view merges the returned node in place.
   */
  onAdvanced: (node: InboundInfoFragment) => void;
}

// The inbound-shipment status footer (spec S3 → status footer): the Hold text
// toggle (confirm before toggling), the lifecycle StatusIndicator (steps by
// kind, history on hover), and the status-change split button. The advance is
// SUBMITTED, not pre-validated (spec S7 / validation.md → actions): a server
// rejection (on hold, cannot-reverse, cannot-set-shipped-on-manual, pending
// lines) returns and is shown inline at the control, the request preserved.
export const InboundShipmentStatusFooter: Component<
  InboundShipmentStatusFooterProps
> = props => {
  const [holdConfirm, setHoldConfirm] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const kind = () => kindOf(props.node);
  const flow = () => statusFlow(kind(), props.node.status);
  const steps = () =>
    flow().map(status => ({
      label: STATUS_LABELS[status],
      date: statusDatetime(props.node, status),
    }));
  const reachable = () => reachableStatuses(kind(), props.node.status);

  const advance = async (status: string) => {
    if (busy()) return;
    setBusy(true);
    setErrorMessage(undefined);
    const result = await updateInboundShipment(
      props.storeId,
      props.isExternal,
      {
        id: props.node.id,
        status: status as NonNullable<
          Parameters<typeof updateInboundShipment>[2]['status']
        >,
      }
    );
    setBusy(false);
    if (result.kind === 'saved') props.onAdvanced(result.node);
    else if (result.kind === 'error') setErrorMessage(result.message);
  };

  const options = () =>
    reachable().map(status => ({
      value: status,
      label: `${t('button.confirm')} ${STATUS_LABELS[status]}`,
    }));

  return (
    <ContentFooter>
      {/* Hold — blocks status changes only; disabled once Verified. Toggling
          prompts a confirmation. */}
      <CheckboxButton
        checked={props.node.onHold}
        disabled={props.disabled}
        data-testid="on-hold-button"
        onChange={() => setHoldConfirm(true)}
      >
        {t('label.hold')}
      </CheckboxButton>

      <StatusIndicator
        steps={steps()}
        current={statusIndex(flow(), props.node.status)}
      />

      {/* A rejected advance shows here, at the control, request preserved. */}
      <Show when={errorMessage()}>
        <Alert severity="error" testId="status-error">
          {errorMessage()}
        </Alert>
      </Show>

      <ContentFooterActions>
        {/* Small Close button beside the status control (distinct from the
            app-bar back-to-list button). */}
        <IconButton
          icon={<CloseIcon />}
          label={t('button.close')}
          onClick={() => history.back()}
        />
        <Show when={!props.disabled && reachable().length > 0}>
          <SplitButton
            icon={<ArrowRightIcon />}
            options={options()}
            value={reachable()[0]}
            testId="status-change-button"
            menuLabel={t('label.status')}
            onAction={status => void advance(status)}
          />
        </Show>
      </ContentFooterActions>

      {/* Toggling hold confirms first (like the stocktake on-hold toggle). */}
      <ConfirmDialog
        open={holdConfirm()}
        onClose={() => setHoldConfirm(false)}
        title={t('heading.are-you-sure')}
        message={
          props.node.onHold
            ? t('messages.off-hold-confirmation')
            : t('messages.on-hold-confirmation')
        }
        onConfirm={() => {
          props.onSetHold(!props.node.onHold);
          setHoldConfirm(false);
        }}
      />
    </ContentFooter>
  );
};
