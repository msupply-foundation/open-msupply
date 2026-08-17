import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { CheckboxButton } from '../../../ui/elements/buttons/CheckboxButton';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { StatusIndicator } from '../../../ui/elements/feedback/StatusIndicator';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import {
  Pagination,
  type PaginationProps,
} from '../../../ui/elements/table/Pagination';
import { StatusChangeAction, type StatusPreflight } from './actions';
import { STATUS_LABELS, statusIndex, isEditable } from '../outboundStatus';
import { allowedStatuses, indicatorStep } from '../outboundStatusOptions';
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
  /**
   * The line table's pager, hosted HERE rather than in a band of its own
   * (spec/ui-standards § tables → pagination): this bar is present at every
   * line count, so a shipment that pages gets its controls without a second
   * row of chrome. The pager renders itself away when there is nowhere to page
   * to, leaving this bar exactly as it was.
   */
  pagination: PaginationProps;
  /** A status change saved — replace the entity in place (the view also
   * refetches the lines page: leaving NEW trims zero rows server-side). */
  onSaved: (node: OutboundNode) => void;
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
  // OMS-REG-DIST-04.22: an excluded current status displays as the nearest
  // included earlier one (indicatorStep, tested beside allowedStatuses).
  const indicatorIndex = () => indicatorStep(allowedStatuses(), currentIndex());

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

      {/* The status-change split button, which hides entirely when read-only
          (spec S3 § status footer). No Close beside it (D103): leaving the
          shipment is the breadcrumb's job, as on every other screen. */}
      <StatusChangeAction
        storeId={props.storeId}
        node={props.node}
        preflight={props.preflight}
        onSaved={props.onSaved}
        leading={
          <>
            {/* The line pager, docked in the action cluster (`inBar` — it
                sizes to its cluster, so a crowded bar wraps the cluster whole
                rather than crushing the pager). Spread of the LIVE prop
                object, as DataTable does, so offset/total changes reach it. */}
            <Pagination {...props.pagination} inBar />
          </>
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
