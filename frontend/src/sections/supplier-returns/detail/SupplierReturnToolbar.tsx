import { type Component } from 'solid-js';
import { t } from '../../../intl';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { NameSearch } from '../../../domain/name';
import type { SupplierReturnInfoFragment } from './supplierReturnDetail.generated';
import { hasOriginalShipment } from './returnStatus';
import type { ReturnFieldEdit } from './returnEdit';

// The detail toolbar (spec/supplier-returns/ui-surface.md S3 § header fields):
// the supplier lookup and the in-place supplier reference. The supplier is
// changeable only while the return is editable AND has no originating shipment
// (rules § header rules) — the link is set at creation and freezes the party. A
// change is a delete-and-recreate (rules § header rules), re-runs the supplier
// checks, and its typed rejections surface inline on the lookup. There is no
// kind banner: a supplier return has a single forward-only lifecycle.

export interface SupplierReturnToolbarProps {
  storeId: string;
  node: SupplierReturnInfoFragment;
  disabled: boolean;
  /** The shared return edit buffer — this toolbar reads/writes theirReference. */
  edit: ReturnFieldEdit;
  /** A supplier change: re-checked server-side; typed errors come back inline. */
  onChangeSupplier: (supplierId: string) => void;
  /** The last supplier-change rejection, shown on the lookup. */
  supplierError?: string;
}

export const SupplierReturnToolbar: Component<
  SupplierReturnToolbarProps
> = props => {
  return (
    // Supplier name with the reference on its own row below (not inline beside
    // it) — one Stack, so the wrapping Toolbar treats the pair as a single block.
    <Stack gap="sm">
      <FieldRow label={t('label.supplier-name')}>
        <NameSearch
          storeId={props.storeId}
          role="supplier"
          label={t('label.supplier-name')}
          hideLabel
          // Seed the record's current supplier so the selection's label
          // resolves before (or regardless of) its page. The detail fragment
          // carries only the party's id + name; the seed's other fields are
          // display hints the input text doesn't use.
          selected={{
            id: props.node.otherPartyId,
            code: '',
            name: props.node.otherPartyName,
            isOnHold: false,
            isStore: false,
            isSupplier: false,
            isDonor: false,
          }}
          disabled={props.disabled || hasOriginalShipment(props.node)}
          error={props.supplierError}
          clearable={false}
          onSelect={supplier => {
            if (supplier) props.onChangeSupplier(supplier.id);
          }}
        />
      </FieldRow>
      <FieldRow label={t('label.supplier-reference')}>
        <TextField
          label={t('label.supplier-reference')}
          hideLabel
          data-testid="supplier-reference-field"
          value={props.edit.state.theirReference}
          disabled={props.disabled}
          onInput={e =>
            props.edit.setField('theirReference', e.currentTarget.value)
          }
          onBlur={() => props.edit.flush()}
        />
      </FieldRow>
    </Stack>
  );
};
