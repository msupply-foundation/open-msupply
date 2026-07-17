import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { CheckboxButton } from '../../../ui/elements/buttons/CheckboxButton';
import { IconButton } from '../../../ui/elements/buttons/IconButton';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { StatusIndicator } from '../../../ui/elements/feedback/StatusIndicator';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { CloseIcon } from '../../../ui/icons';
import { StatusChangeAction } from './actions';
import { STATUS_LABELS, statusIndex, isEditable } from '../outboundStatus';
import { allowedStatuses } from '../outboundPreferencesResource';
import type { OutboundNode } from './outboundUpdate';

// The shipment status footer (spec S3 § status footer): the Hold toggle
// (confirmation both ways — AC-H1/H2), the lifecycle indicator over the FULL
// status sequence (transfer statuses included, limited by the invoice-status-
// options preference — AC-PR1), Close (back to the list), and the
// status-change split button (its own action component). Replaced by the
// bulk-action bar while lines are selected (AC-V2).

export interface OutboundStatusFooterProps {
  storeId: string;
  node: OutboundNode;
  /** Lines exist / placeholders-with-quantity — the pre-flight inputs. */
  hasLines: boolean;
  hasOnlyPlaceholders: boolean;
  placeholderItemsWithQuantity: string[];
  zeroQuantityItems: string[];
  /** Toggle hold (writes onHold via the field-save path). */
  onSetHold: (hold: boolean) => void;
  /** A status change saved — replace the node (with its lines) in place. */
  onSaved: (node: OutboundNode) => void;
  /** Close — navigate back to the list. */
  onClose: () => void;
}

export const OutboundStatusFooter: Component<
  OutboundStatusFooterProps
> = props => {
  const [holdConfirm, setHoldConfirm] = createSignal(false);

  const editable = () => isEditable(props.node.status);
  const holding = () => props.node.onHold;
  const currentIndex = () => statusIndex(props.node.status);

  // The lifecycle indicator over the preference-allowed sequence. A status
  // already reached stays visible even if the preference excludes it later in
  // the flow (the current status is always shown).
  const steps = () => {
    const stamps: Record<string, string | null | undefined> = {
      NEW: props.node.createdDatetime,
      ALLOCATED: props.node.allocatedDatetime,
      PICKED: props.node.pickedDatetime,
      SHIPPED: props.node.shippedDatetime,
      DELIVERED: props.node.deliveredDatetime,
      RECEIVED: props.node.receivedDatetime,
      VERIFIED: props.node.verifiedDatetime,
    };
    return allowedStatuses().map(status => ({
      label: STATUS_LABELS[status],
      date: stamps[status],
    }));
  };
  const indicatorIndex = () =>
    allowedStatuses().findIndex(
      status => statusIndex(status) >= currentIndex()
    );

  return (
    <ContentFooter>
      {/* Hold: blocks status changes only, not edits (rules.md § on hold).
          Editable while the shipment is editable; hidden from SHIPPED. */}
      <Show when={editable()}>
        <CheckboxButton
          data-testid="on-hold-button"
          checked={holding()}
          onChange={() => setHoldConfirm(true)}
        >
          {t('outbound.customer.on-hold')}
        </CheckboxButton>
      </Show>

      <StatusIndicator steps={steps()} current={indicatorIndex()} />

      {/* Close (back to the list) + the status-change split button. The split
          button hides entirely when read-only (spec S3 § status footer). */}
      <StatusChangeAction
        storeId={props.storeId}
        node={props.node}
        hasLines={props.hasLines}
        hasOnlyPlaceholders={props.hasOnlyPlaceholders}
        placeholderItemsWithQuantity={props.placeholderItemsWithQuantity}
        zeroQuantityItems={props.zeroQuantityItems}
        onSaved={props.onSaved}
        closeButton={
          <IconButton
            bordered
            icon={<CloseIcon />}
            label={t('common.close')}
            data-testid="close-button"
            onClick={props.onClose}
          />
        }
      />

      {/* Mounted only while open — its confirmation-modal test hook must not
          coexist with the status-change dialog's. */}
      <Show when={holdConfirm()}>
        <ConfirmDialog
          open
          onClose={() => setHoldConfirm(false)}
          title={t('outbound.hold.title')}
          message={
            holding() ? t('outbound.hold.unset') : t('outbound.hold.set')
          }
          onConfirm={() => props.onSetHold(!holding())}
        />
      </Show>
    </ContentFooter>
  );
};
