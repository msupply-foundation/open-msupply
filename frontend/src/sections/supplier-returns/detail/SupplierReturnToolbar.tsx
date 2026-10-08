import { type Component } from 'solid-js';
import { t } from '../../../intl';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { NameSearch } from '../../../domain/name';
import type { SupplierReturnInfoFragment } from './supplierReturnDetail.generated';
import { hasOriginalShipment } from './returnStatus';
import type { ReturnFieldEdit } from './returnEdit';

// The detail header's field cluster (spec/supplier-returns/ui-surface.md S3
// § header fields), rendered as the children of the page's <HeaderToolbar>:
// each field carries its own label above a small control, and HeaderToolbar's
// FormRow gives them equal shares that wrap as a unit (ui/docs/PAGES.md
// § header field cluster) — the same shape every other detail header uses.
//
// The fields: the supplier lookup and the in-place supplier reference. The
// supplier is changeable only while the return is editable AND has no
// originating shipment (rules § header rules) — the link is set at creation
// and freezes the party. A change is a delete-and-recreate (rules § header
// rules), re-runs the supplier checks, and its typed rejections surface
// inline on the lookup. There is no kind banner: a supplier return has a
// single forward-only lifecycle.

export interface SupplierReturnToolbarProps {
  storeId: string;
  node: SupplierReturnInfoFragment;
  disabled: boolean;
  /**
   * The shared return edit buffer — this toolbar reads/writes theirReference.
   */
  edit: ReturnFieldEdit;
  /**
   * A supplier change: re-checked server-side; typed errors come back inline.
   */
  onChangeSupplier: (supplierId: string) => void;
  /** The last supplier-change rejection, shown on the lookup. */
  supplierError?: string;
}

export const SupplierReturnToolbar: Component<
  SupplierReturnToolbarProps
> = props => {
  return (
    <>
      <NameSearch
        storeId={props.storeId}
        role="supplier"
        label={t('label.supplier-name')}
        size="small"
        // Seed the record's current supplier so the selection's label
        // resolves before its page does.
        selected={{
          id: props.node.otherPartyId,
          name: props.node.otherPartyName,
        }}
        disabled={props.disabled || hasOriginalShipment(props.node)}
        error={props.supplierError}
        clearable={false}
        onSelect={supplier => {
          if (supplier) props.onChangeSupplier(supplier.id);
        }}
      />

      <TextField
        label={t('label.supplier-reference')}
        size="small"
        data-testid="supplier-reference-field"
        value={props.edit.state.theirReference}
        disabled={props.disabled}
        onInput={e =>
          props.edit.setField('theirReference', e.currentTarget.value)
        }
        onBlur={() => props.edit.flush()}
      />
    </>
  );
};
