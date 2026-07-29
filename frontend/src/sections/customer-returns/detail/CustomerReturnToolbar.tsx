import { Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { NameSearch } from '../../../domain/name';
import type { CustomerReturnInfoFragment } from './customerReturnDetail.generated';
import { returnKind } from './returnStatus';
import type { ReturnFieldEdit } from './returnEdit';
import styles from './CustomerReturnToolbar.module.css';

// The detail toolbar (spec/customer-returns/ui-surface.md S3 § header fields):
// the customer lookup, the in-place customer reference, and the kind banner.
// The customer is changeable only while the return is editable AND manual
// (a transfer return's customer is the sending store); a change re-runs the
// customer checks and its typed rejections surface inline on the lookup
// (OMS-REG-DIST-07.17 / .24).

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
      {/* Customer name with the reference on its own row below (not inline
          beside it) — one Stack, so the wrapping Toolbar treats the pair as
          a single block. */}
      <Stack gap="sm">
        <FieldRow label={t('label.customer-name')}>
          <NameSearch
            storeId={props.storeId}
            role="customer"
            label={t('label.customer-name')}
            hideLabel
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
      </Stack>
      {/* The kind banner (rules § manual vs transfer): manual returns don't
          track delivery automatically; a transfer return explains why editing
          waits until it is received (OMS-REG-DIST-07.43). */}
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
