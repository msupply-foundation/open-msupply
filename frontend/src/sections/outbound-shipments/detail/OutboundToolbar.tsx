import type { Component } from 'solid-js';
import { t } from '../../../intl';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { NameSearch } from '../../../domain/name';
import { CustomFieldsToolbar } from '../../../domain/customFields';
import type { OutboundNode } from './outboundUpdate';
import type { OutboundFieldEdit } from './outboundEdit';

export interface OutboundToolbarProps {
  storeId: string;
  node: OutboundNode;
  /** The shipment is no longer editable (SHIPPED onward). */
  disabled: boolean;
  edit: OutboundFieldEdit;
  /** Rejection of a customer change, shown on the lookup itself. */
  customerError?: string;
  onChangeCustomer: (nameId: string) => void;
  onSaveCustomFields: (patch: Record<string, unknown>) => void;
}

/*
 * The detail header's field cluster (spec S3 § Layout → app bar), rendered as
 * the children of the page's <HeaderToolbar>: each field carries its own label
 * above a small control, and HeaderToolbar's FormRow gives them equal shares
 * that wrap as a unit (ui/docs/PAGES.md § header field cluster). Same shape as
 * the sibling shipment toolbars — InboundShipmentDetailToolbar,
 * SupplierReturnToolbar, CustomerReturnToolbar.
 */
export const OutboundToolbar: Component<OutboundToolbarProps> = props => (
  <>
    {/* Customer lookup: locked when the shipment is no longer editable, and
        when it came from a requisition (OMS-REG-DIST-02.19). */}
    <NameSearch
      label={t('label.customer-name')}
      size="small"
      storeId={props.storeId}
      role="customer"
      // Seed the record's current customer so the selection's label resolves
      // before (or regardless of) its page.
      selected={{
        id: props.node.otherParty.id,
        name: props.node.otherParty.name,
        code: props.node.otherParty.code,
        isOnHold: props.node.otherParty.isOnHold,
        isStore: props.node.otherParty.store != null,
        isSupplier: false,
        isDonor: false,
      }}
      disabled={props.disabled || props.node.requisition != null}
      error={props.customerError}
      clearable={false}
      onSelect={customer => {
        if (customer) props.onChangeCustomer(customer.id);
      }}
    />

    <TextField
      label={t('label.customer-ref')}
      size="small"
      width="full"
      data-testid="customer-reference-field"
      value={props.edit.state.theirReference}
      disabled={props.disabled}
      onInput={e =>
        props.edit.setField('theirReference', e.currentTarget.value)
      }
      onBlur={() => props.edit.flush()}
    />

    {/* PROMINENT custom fields — they stay in the header even when the shipment
        is read-only (past PICKED), just disabled. `layout="field"` is the
        HeaderToolbar form of the cluster (label above the control). */}
    <CustomFieldsToolbar
      scope="outbound_shipment"
      recordId={props.node.id}
      values={props.node.customFields}
      disabled={props.disabled}
      layout="field"
      onSave={props.onSaveCustomFields}
    />
  </>
);
