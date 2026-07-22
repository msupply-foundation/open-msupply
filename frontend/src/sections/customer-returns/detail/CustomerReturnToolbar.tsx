import { Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { CustomerSelect } from '../../../domain/customer';
import type { CustomerReturnInfoFragment } from './customerReturnDetail.generated';
import { returnKind } from './returnStatus';
import type { ReturnFieldEdit } from './returnEdit';
import styles from './CustomerReturnToolbar.module.css';

// The detail toolbar (spec/customer-returns/ui-surface.md S3 § header fields):
// the customer lookup, the in-place customer reference, and the kind banner.
// The customer is changeable only while the return is editable AND manual
// (a transfer return's customer is the sending store); a change re-runs the
// customer checks and its typed rejections surface inline on the lookup
// (AC-C2 / AC-E6).

export interface CustomerReturnToolbarProps {
  storeId: string;
  node: CustomerReturnInfoFragment;
  disabled: boolean;
  /** The shared return edit buffer — this toolbar reads/writes theirReference. */
  edit: ReturnFieldEdit;
  /** A customer change: re-checked server-side; typed errors come back inline. */
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
      <FieldRow label={t('label.customer-name')}>
        <CustomerSelect
          storeId={props.storeId}
          label={t('label.customer-name')}
          hideLabel
          value={props.node.otherPartyId}
          selected={{
            id: props.node.otherPartyId,
            code: '',
            name: props.node.otherPartyName,
            isOnHold: false,
            store: null,
          }}
          disabled={props.disabled || kind() === 'transfer'}
          error={props.customerError}
          onChange={customer => {
            if (customer) props.onChangeCustomer(customer.id);
          }}
        />
      </FieldRow>
      <FieldRow label={t('label.customer-ref')}>
        <TextField
          label={t('label.customer-ref')}
          hideLabel
          data-testid="customer-reference-field"
          value={props.edit.state.theirReference}
          disabled={props.disabled}
          onInput={e =>
            props.edit.setField('theirReference', e.currentTarget.value)
          }
          onBlur={() => props.edit.flush()}
        />
      </FieldRow>
      {/* The kind banner (rules § manual vs transfer): manual returns don't
          track delivery automatically; a transfer return explains why editing
          waits until it is received (AC-T1). */}
      <Show
        when={kind() === 'transfer'}
        fallback={
          <Alert severity="info" class={styles.kindBanner}>
            {t('info.manual-return')}
          </Alert>
        }
      >
        <Alert severity="info" class={styles.kindBanner}>
          {t('info.automatic-return')}
          <Show when={props.disabled && props.node.status !== 'VERIFIED'}>
            {' '}
            {t('info.automatic-return-no-edit')}
          </Show>
        </Alert>
      </Show>
    </>
  );
};
