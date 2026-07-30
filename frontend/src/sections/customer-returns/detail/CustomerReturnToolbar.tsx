import { type Component } from 'solid-js';
import { t } from '../../../intl';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { NameSearch } from '../../../domain/name';
import type { CustomerReturnInfoFragment } from './customerReturnDetail.generated';
import { returnKind } from './returnStatus';
import type { ReturnFieldEdit } from './returnEdit';

// The detail header's field cluster (spec/customer-returns/ui-surface.md S3
// § header fields), rendered as the children of the page's <HeaderToolbar>:
// each field carries its own label above a small control and the cluster's
// FormRow gives them equal shares that wrap as a unit (ui/docs/PAGES.md
// § header field cluster). The kind banner is NOT here — it's the cluster's
// trailing compact Alert, passed to <HeaderToolbar alert={…}> by the view.
//
// The customer is changeable only while the return is editable AND manual
// (a transfer return's customer is the sending store); a change re-runs the
// customer checks and its typed rejections surface inline on the lookup
// (OMS-REG-DIST-07.17 / .24).

export interface CustomerReturnToolbarProps {
  storeId: string;
  node: CustomerReturnInfoFragment;
  disabled: boolean;
  /**
   * The shared return edit buffer — this toolbar reads/writes theirReference.
   */
  edit: ReturnFieldEdit;
  /**
   * A customer change: re-checked server-side; typed errors come back inline.
   */
  onChangeCustomer: (customerId: string) => void;
  /** The last customer-change rejection, shown on the lookup. */
  customerError?: string;
}

export const CustomerReturnToolbar: Component<
  CustomerReturnToolbarProps
> = props => {
  const kind = () => returnKind(props.node);
  return (
    <>
      <NameSearch
        label={t('label.customer-name')}
        size="small"
        storeId={props.storeId}
        role="customer"
        // Seed the record's current customer so the selection's label
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
        disabled={props.disabled || kind() === 'transfer'}
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
    </>
  );
};
