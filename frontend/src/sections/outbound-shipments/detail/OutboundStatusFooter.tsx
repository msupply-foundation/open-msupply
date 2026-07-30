import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { CheckboxButton } from '../../../ui/elements/buttons/CheckboxButton';
import { IconButton } from '../../../ui/elements/buttons/IconButton';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { StatusIndicator } from '../../../ui/elements/feedback/StatusIndicator';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { CloseIcon } from '../../../ui/icons';
import { StatusChangeAction, type StatusPreflight } from './actions';
import { STATUS_LABELS, statusIndex, isEditable } from '../outboundStatus';
import { allowedStatuses } from '../outboundStatusOptions';
import type { OutboundNode } from './outboundUpdate';

// The shipment status footer (spec S3 § status footer): the Hold toggle
// (confirmation both ways — OMS-REG-DIST-02.10/.27), the lifecycle indicator
// over the FULL status sequence (transfer statuses included, limited by the
// invoice-status-options preference — OMS-REG-DIST-04.22), Close (back to
// the list), and the status-change split button (its own action component).
// Replaced by the bulk-action bar while lines are selected
// (OMS-REG-DIST-04.20).

export interface OutboundStatusFooterProps {
  storeId: string;
  node: OutboundNode;
  /**
   * Whole-shipment pre-flight probe (OMS-REG-DIST-04.15/OMS-REG-DIST-04.16),
   * run when the status button is invoked — the current lines page can't
   * answer for the whole shipment (rules.md § server-paginated line table).
   * Undefined = the probe failed (already routed to the global error modal);
   * the action aborts.
   */
  preflight: () => Promise<StatusPreflight | undefined>;
  /** Toggle hold (writes onHold via the field-save path). */
  onSetHold: (hold: boolean) => void;
  /** A status change saved — replace the entity in place (the view also
   * refetches the lines page: leaving NEW trims zero rows server-side). */
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
  // OMS-REG-DIST-04.22: a current status the preference EXCLUDES displays as
  // the nearest included EARLIER status — the LAST allowed entry at or before
  // the current one (allowedStatuses() is already in ascending flow order). A
  // plain loop rather than Array#findLastIndex: eslint-plugin-solid doesn't
  // recognise it as a safe callback host (unlike findIndex/map/etc.), so it
  // misreports the predicate's currentIndex() read as untracked.
  const indicatorIndex = () => {
    const allowed = allowedStatuses();
    let result = -1;
    for (let i = 0; i < allowed.length; i++) {
      if (statusIndex(allowed[i]) <= currentIndex()) result = i;
      else break;
    }
    return result;
  };

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
          {t('label.hold')}
        </CheckboxButton>
      </Show>

      <StatusIndicator steps={steps()} current={indicatorIndex()} />

      {/* Close (back to the list) + the status-change split button. The split
          button hides entirely when read-only (spec S3 § status footer). */}
      <StatusChangeAction
        storeId={props.storeId}
        node={props.node}
        preflight={props.preflight}
        onSaved={props.onSaved}
        closeButton={
          // Plain (unbordered) icon button — the same close the inbound
          // status footer renders.
          <IconButton
            icon={<CloseIcon />}
            label={t('button.close')}
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
          title={t('heading.are-you-sure')}
          message={
            holding()
              ? t('messages.off-hold-confirmation')
              : t('messages.on-hold-confirmation')
          }
          onConfirm={() => props.onSetHold(!holding())}
        />
      </Show>
    </ContentFooter>
  );
};
