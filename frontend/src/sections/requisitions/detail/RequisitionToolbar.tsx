import { Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { FormColumns } from '../../../ui/layout/Form/FormColumns';
import { FormColumn } from '../../../ui/layout/Form/FormColumn';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { NameSearch, type NameOption } from '../../../domain/name';
import { type DebouncedEdit } from '../../../domain/debouncedEdit';
import { approvalStatusLabel } from './requisitionDetailStatus';
import type { RequisitionInfoFragment } from './requisitionDetail.generated';
import styles from './RequisitionToolbar.module.css';

// The buffered as-you-type header fields — reference + comment share one
// buffer; this toolbar reads theirReference, the side panel reads comment.
export type HeaderEditFields = { theirReference: string; comment: string };

// The detail toolbar (spec/requisitions S2 § toolbar): two label-led field-row
// columns — Customer name (always disabled: a requisition's customer is never
// changed), Customer reference (in-place buffered), Destination customer
// (read-only, only when one is named), Approval status (gated) — beside the
// Program field (rendered on every requisition, empty on a non-program one,
// captured as-is); a full-width banner beneath when the customer's store is
// disabled, and the header-save rejection inline. The item filter lives in
// the line table's own toolbar (ui-standards § tables → filtering), not here.
export interface RequisitionToolbarProps {
  storeId: string;
  node: RequisitionInfoFragment;
  /** The standing editability gate (New, not approval-blocked, store enabled). */
  editable: boolean;
  /** The approval gate (authorisation preference + a non-NONE status). */
  showApproval: boolean;
  /** The shared header edit buffer; reads/writes theirReference. */
  edit: DebouncedEdit<HeaderEditFields>;
  /**
   * A header save's rejection (whole-record validation — rules › header
   * edits), surfaced inline beneath the fields.
   */
  headerError?: string;
}

export const RequisitionToolbar: Component<RequisitionToolbarProps> = props => {
  const customerSeed = (): NameOption => ({
    id: props.node.otherPartyId,
    name: props.node.otherPartyName,
    code: '',
    isSupplier: false,
    isDonor: false,
    isOnHold: false,
    isStore: false,
  });
  const destinationSeed = (): NameOption | undefined => {
    const dc = props.node.destinationCustomer;
    return dc
      ? {
          id: dc.id,
          name: dc.name,
          code: '',
          isSupplier: false,
          isDonor: false,
          isOnHold: false,
          isStore: true,
        }
      : undefined;
  };

  return (
    <div class={styles.layout}>
      <FormColumns>
        {/* Left column — customer, reference, (present-only) destination
            customer, (gated) approval status. */}
        <FormColumn>
          <Stack gap="sm">
            <FieldRow label={t('label.customer-name')}>
              {/* Always disabled — a requisition's customer is never changed,
                  on any surface (rules › header edits). */}
              <NameSearch
                storeId={props.storeId}
                role="customer"
                label={t('label.customer-name')}
                hideLabel
                selected={customerSeed()}
                disabled
                clearable={false}
                onSelect={() => {}}
              />
            </FieldRow>
            <FieldRow label={t('label.customer-ref')}>
              <TextField
                label={t('label.customer-ref')}
                hideLabel
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
            </FieldRow>
            <Show when={props.node.destinationCustomer}>
              <FieldRow label={t('label.destination-customer')}>
                {/* Read-only: the alternative receiving party is a fact of the
                    record here; raised shipments address it (rules › raising a
                    shipment). */}
                <NameSearch
                  storeId={props.storeId}
                  role="customer"
                  label={t('label.destination-customer')}
                  hideLabel
                  selected={destinationSeed()}
                  disabled
                  clearable={false}
                  onSelect={() => {}}
                />
              </FieldRow>
            </Show>
            <Show when={props.showApproval}>
              <FieldRow label={t('label.auth-status')}>
                <span data-testid="approval-status-field">
                  {approvalStatusLabel(props.node.approvalStatus)}
                </span>
              </FieldRow>
            </Show>
          </Stack>
        </FormColumn>

        {/* Second column — the Program field (rendered on every requisition,
            empty on a non-program one — captured as-is). */}
        <FormColumn>
          <Stack gap="sm">
            <FieldRow label={t('label.program')}>
              <TextField
                label={t('label.program')}
                hideLabel
                width="full"
                data-testid="program-field"
                value={props.node.programName ?? ''}
                disabled
              />
            </FieldRow>
          </Stack>
        </FormColumn>
      </FormColumns>

      {/* Full-width notices beneath both columns. */}
      <Stack gap="sm">
        <Show when={props.node.otherParty.store?.isDisabled}>
          <Alert severity="info">{t('info.cannot-edit-disabled-store')}</Alert>
        </Show>
        {/* A header save's whole-record rejection (reasons / emergency cap /
            cannot-edit) — inline, the entered value kept in the buffer
            (ui-standards › inputs › editing & saving). */}
        <Show when={props.headerError}>
          <Alert severity="error">{props.headerError}</Alert>
        </Show>
      </Stack>
    </div>
  );
};
