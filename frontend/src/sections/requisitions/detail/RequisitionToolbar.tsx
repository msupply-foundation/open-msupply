import { Show, type Component } from 'solid-js';
import { t } from '@/intl';
import { TextField } from '@/ui/elements/inputs/TextField';
import { LabelledValue } from '@/ui/elements/typography/LabelledValue';
import { FormRowItem } from '@/ui/layout/Form/FormRowItem';
import { type DebouncedEdit } from '@/domain/debouncedEdit';
import { approvalStatusLabel } from './requisitionDetailStatus';
import type { RequisitionInfoFragment } from './requisitionDetail.generated';

// The detail header's field cluster (spec/requisitions S2 § toolbar), rendered
// as the children of the page's <HeaderToolbar>: each field carries its own
// label above a small control, and the cluster's FormRow shares the row per
// each field's FormRowItem weight — the names take the larger shares, the
// short facts the smaller. Customer name, Destination customer, Approval
// status and Program are never editable on this screen on any state, so they
// are read-only LabelledValues sitting flush among the inputs
// (variant="field") — read-only reads from the absence of a box, not a
// greyed-out one (ui-standards › detail-views § never-editable fields).
// Customer reference is the one real input (state-locked while not editable).
// The item filter lives in the line table's own toolbar (ui-standards §
// tables → filtering), not here; the disabled-store notice and the
// header-save rejection are the VIEW's (the alert chip slot and the row
// beneath the cluster).

// The buffered as-you-type header fields — reference + comment share one
// buffer; this toolbar reads theirReference, the side panel reads comment.
export type HeaderEditFields = { theirReference: string; comment: string };

export interface RequisitionToolbarProps {
  node: RequisitionInfoFragment;
  /** The standing editability gate (New, not approval-blocked, store enabled). */
  editable: boolean;
  /** The approval gate (authorisation preference + a non-NONE status). */
  showApproval: boolean;
  /** The shared header edit buffer; reads/writes theirReference. */
  edit: DebouncedEdit<HeaderEditFields>;
}

export const RequisitionToolbar: Component<RequisitionToolbarProps> = props => {
  // Cluster weights: the whole cluster is weighted (never just one field —
  // FormRowItem's rule); the name facts take the larger shares. This cluster
  // is SPARSE — often just three fields — so every field also declares the
  // width it can actually use (`maxWidth`, or `weight={0}` for the
  // fixed-vocabulary approval status): without ceilings, three fields split
  // the whole row and the gap between a short read-only value and its
  // neighbour reads as empty screen (PAGES.md § header field cluster).
  return (
    <>
      <FormRowItem weight={1.5} maxWidth="18rem">
        {/* Never changed on any surface (rules › header edits) — a read-only
            fact, not a disabled lookup. */}
        <LabelledValue
          label={t('label.customer-name')}
          variant="field"
          size="small"
          data-testid="customer-name-field"
        >
          {props.node.otherPartyName}
        </LabelledValue>
      </FormRowItem>
      <FormRowItem weight={1} maxWidth="20rem">
        <TextField
          label={t('label.customer-ref')}
          size="small"
          width="full"
          data-testid="customer-reference-field"
          // A tooltip reveals an overflowing value (spec S2 § toolbar).
          title={props.edit.state.theirReference}
          value={props.edit.state.theirReference}
          disabled={!props.editable}
          onInput={e =>
            props.edit.setField('theirReference', e.currentTarget.value)
          }
          onBlur={() => props.edit.flush()}
        />
      </FormRowItem>
      <Show when={props.node.destinationCustomer}>
        {dc => (
          <FormRowItem weight={1.5} maxWidth="18rem">
            {/* Read-only: the alternative receiving party is a fact of the
                record here; raised shipments address it (rules › raising a
                shipment). */}
            <LabelledValue
              label={t('label.destination-customer')}
              variant="field"
              size="small"
              data-testid="destination-customer-field"
            >
              {dc().name}
            </LabelledValue>
          </FormRowItem>
        )}
      </Show>
      <Show when={props.showApproval}>
        {/* A fixed-vocabulary scalar: pinned at its floor, spare width flows
            to the name fields. */}
        <FormRowItem weight={0} minWidth="8.5rem">
          <LabelledValue
            label={t('label.auth-status')}
            variant="field"
            size="small"
            data-testid="approval-status-field"
          >
            {approvalStatusLabel(props.node.approvalStatus)}
          </LabelledValue>
        </FormRowItem>
      </Show>
      <FormRowItem weight={1} maxWidth="14rem">
        {/* Rendered on every requisition, a dash on a non-program one —
            captured as-is (spec S2 § toolbar). */}
        <LabelledValue
          label={t('label.program')}
          variant="field"
          size="small"
          data-testid="program-field"
        >
          {props.node.programName ?? '—'}
        </LabelledValue>
      </FormRowItem>
    </>
  );
};
