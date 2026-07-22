import { Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { TextArea } from '../../../ui/elements/inputs/TextArea';
import { DateField } from '../../../ui/elements/inputs/DateField';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { NameSearch, type NameOption } from '../../../domain/name';
import {
  FilterBar,
  constructFilters,
  type Filter,
} from '../../../ui/elements/selectors/FilterBar';
import type { InboundInfoFragment } from './inboundShipmentDetail.generated';
import type { InboundLineFilter } from './inboundShipmentLineFilter';
import type { InboundFieldEdit } from './inboundShipmentEdit';
import { kindOf, supplierIsStore } from './inboundShipmentStatus';
import type { UpdateInboundShipmentVariables } from './inboundShipmentDetail.generated';

export interface InboundShipmentDetailToolbarProps {
  storeId: string;
  node: InboundInfoFragment;
  /** True once Verified (global edit lock). */
  disabled: boolean;
  edit: InboundFieldEdit;
  /** Store backdating gate + window (from inboundShipmentPreferences). */
  backdatingEnabled: boolean;
  backdatingMaxDays: number;
  filter: InboundLineFilter;
  onFilterChange: (filter: InboundLineFilter) => void;
  onSaveField: (
    patch: Partial<Omit<UpdateInboundShipmentVariables['input'], 'id'>>
  ) => void;
}

// The line-table item-search filter — the only surfaced line filter (server
// supports itemId/locationId, but a free-text item search maps to neither
// directly; here we expose location by code via the standard chip set and keep
// item search as an always-on text box). Built once (module load).
const lineFilters: Filter<InboundLineFilter>[] =
  constructFilters<InboundLineFilter>({
    id: null,
    storeId: null,
    invoiceId: null,
    locationId: null,
    itemId: null,
    type: null,
    requisitionId: null,
    numberOfPacks: null,
    invoiceType: null,
    invoiceStatus: null,
    stockLineId: null,
    reasonOption: null,
    verifiedDatetime: null,
    programId: null,
    isProgramInvoice: null,
  });

export const InboundShipmentDetailToolbar: Component<
  InboundShipmentDetailToolbarProps
> = props => {
  const kind = () => kindOf(props.node);

  // Supplier is editable only on a manual shipment that isn't Verified — never
  // on a transfer or a PO-linked shipment (spec S3 header fields).
  const supplierLocked = () => props.disabled || kind() !== 'manual';

  const selectedSupplier = (): NameOption => ({
    id: props.node.otherPartyId,
    name: props.node.otherPartyName,
    code: '',
    isSupplier: true,
    isDonor: false,
    isOnHold: false,
    isStore: supplierIsStore(props.node),
  });

  // Received date: editable only when Received/Verified, backdating is enabled,
  // and within the window — else disabled with the reason. Server enforces;
  // the client only mirrors standing editability (spec S3 / validation.md).
  const isReceived = () =>
    props.node.status === 'RECEIVED' || props.node.status === 'VERIFIED';
  const receivedDateEditable = () =>
    isReceived() && props.backdatingEnabled && !props.disabled;
  const receivedDateReason = () => {
    if (props.disabled) return t('error.inbound-shipment-not-editable');
    if (!isReceived()) return t('messages.can-only-backdate-received');
    if (!props.backdatingEnabled) return t('messages.backdating-not-enabled');
    return undefined;
  };

  return (
    <>
      {/* Kind banner: manual shipments don't auto-advance; a transfer/automatic
          one is driven by the sending side. */}
      <Alert severity="info">
        {kind() === 'manual'
          ? t('messages.inbound-manual-info')
          : t('messages.inbound-automatic-info')}
      </Alert>

      <FieldRow label={t('label.supplier-name')}>
        <NameSearch
          label={t('label.supplier-name')}
          hideLabel
          storeId={props.storeId}
          role="supplier"
          selected={selectedSupplier()}
          disabled={supplierLocked()}
          onSelect={name =>
            name && props.onSaveField({ otherPartyId: name.id })
          }
        />
      </FieldRow>

      <FieldRow label={t('label.reference')}>
        <TextArea
          label={t('label.reference')}
          hideLabel
          rows={1}
          width="full"
          value={props.edit.state.theirReference}
          disabled={props.disabled}
          onInput={e =>
            props.edit.setField('theirReference', e.currentTarget.value)
          }
          onBlur={() => props.edit.flush()}
        />
      </FieldRow>

      <FieldRow label={t('label.received')}>
        <DateField
          label={t('label.received')}
          hideLabel
          value={props.node.receivedDatetime?.slice(0, 10) ?? null}
          disabled={!receivedDateEditable()}
          helperText={receivedDateReason()}
          // Backdating only ever moves the date earlier — cap at the current
          // received date. (Server also bounds by the max-days window.)
          max={props.node.receivedDatetime?.slice(0, 10) ?? undefined}
          onChange={value =>
            value &&
            props.onSaveField({ receivedDatetime: `${value}T00:00:00.000Z` })
          }
        />
      </FieldRow>

      {/* PO-linked: read-only PO number + reference (spec S3 header fields). */}
      <Show when={props.node.purchaseOrder}>
        {po => (
          <>
            <FieldRow label={t('label.purchase-order')}>
              <span>#{po().number}</span>
            </FieldRow>
            <Show when={po().reference}>
              <FieldRow label={t('label.reference')}>
                <span>{po().reference}</span>
              </FieldRow>
            </Show>
          </>
        )}
      </Show>

      {/* Transport details on a transfer are read-only; shown in the side
          panel. Here the line item-search filter. */}
      <FilterBar
        filters={lineFilters}
        filter={props.filter}
        onChange={props.onFilterChange}
      />
    </>
  );
};
