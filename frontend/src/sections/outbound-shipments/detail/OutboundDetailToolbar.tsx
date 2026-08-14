import { type Component } from 'solid-js';
import { t } from '../../../intl';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { NameSearch } from '../../../domain/name';
import { CustomFieldsToolbar } from '../../../domain/customFields';
import type { OutboundNode } from './outboundUpdate';
import type { OutboundFieldEdit } from './outboundEdit';

/*
 * The detail header's field cluster (spec S3 § header fields), rendered as the
 * children of the page's <HeaderToolbar>: each field carries its own label
 * above a small control, and HeaderToolbar's FormRow gives them equal shares
 * that wrap as a unit (ui/docs/PAGES.md § header field cluster) — never a
 * hand-rolled <Toolbar> + FieldRow. The line table's filters live in the
 * DataTable's own toolbar (OutboundLineFilters), not here (ui-standards →
 * tables › filtering).
 *
 * The customer reference reads/writes the shared shipment edit buffer (owned by
 * the view, one across the whole entity), so typing is buffered + debounced and
 * coalesces with any side-panel edits into a single save
 * (kdd/state-management).
 */
export interface OutboundDetailToolbarProps {
  storeId: string;
  node: OutboundNode;
  /** Read-only from SHIPPED (the whole-record editability gate). */
  disabled: boolean;
  /** The shared edit buffer — the reference field reads/writes its key. */
  edit: OutboundFieldEdit;
  /** A rejected customer change, surfaced on the lookup itself. */
  customerError?: string;
  onChangeCustomer: (customerId: string) => void;
  /** Prominent custom fields save through the same field-save path. */
  onSaveCustomFields: (patch: Record<string, unknown>) => void;
}

export const OutboundDetailToolbar: Component<
  OutboundDetailToolbarProps
> = props => {
  // The customer can be changed while editable, but never on a
  // requisition-sourced shipment (OMS-REG-DIST-02.19).
  const customerLocked = () => props.disabled || props.node.requisition != null;

  return (
    <>
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
        disabled={customerLocked()}
        error={props.customerError}
        // A shipment always has a customer — changed, never cleared (spec S3).
        clearable={false}
        onSelect={customer => {
          if (customer) props.onChangeCustomer(customer.id);
        }}
      />

      <TextField
        label={t('label.customer-ref')}
        size="small"
        data-testid="customer-reference-field"
        value={props.edit.state.theirReference}
        disabled={props.disabled}
        onInput={e =>
          props.edit.setField('theirReference', e.currentTarget.value)
        }
        onBlur={() => props.edit.flush()}
      />

      {/* PROMINENT custom fields join the same row — `layout="field"` so they
          wear their labels above the control like the cluster's other fields.
          They stay here even when the shipment is read-only (past PICKED),
          just disabled. */}
      <CustomFieldsToolbar
        scope="outbound_shipment"
        recordId={props.node.id}
        values={props.node.customFields}
        layout="field"
        disabled={props.disabled}
        onSave={props.onSaveCustomFields}
      />
    </>
  );
};
