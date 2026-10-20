import type { Component } from 'solid-js';
import {
  ServiceChargesTable,
  type ServiceChargeBatch,
  type ServiceChargesEditor,
  type ServiceItem,
} from '@/domain/invoice';
import {
  fetchInboundServiceCharges,
  fetchInboundServiceLines,
  saveInboundServiceCharges,
} from '../modals/inboundServiceCharges';

// The detail "Service charges" tab (spec S3 tabs → Service charges).
export const InboundServiceChargesPanel: Component<{
  storeId: string;
  invoiceId: string;
  isExternal: boolean;
  disabled: boolean;
  serviceItems: ServiceItem[] | undefined;
  editor: ServiceChargesEditor | undefined;
  onEditorChange: (editor: ServiceChargesEditor | undefined) => void;
  onChanged: () => void;
}> = props => {
  const save = (batch: ServiceChargeBatch) =>
    saveInboundServiceCharges(
      props.storeId,
      props.isExternal,
      props.invoiceId,
      batch
    );
  return (
    <ServiceChargesTable
      tableId="inbound-shipment-service-charges"
      storeId={props.storeId}
      invoiceId={props.invoiceId}
      disabled={props.disabled}
      serviceItems={props.serviceItems}
      editor={props.editor}
      onEditorChange={props.onEditorChange}
      fetchLines={invoiceId =>
        fetchInboundServiceLines(props.storeId, invoiceId)
      }
      fetchCharges={() =>
        fetchInboundServiceCharges(props.storeId, props.invoiceId)
      }
      save={save}
      deleteLine={line =>
        save({ inserts: [], updates: [], deletes: [{ id: line.id }] })
      }
      onChanged={props.onChanged}
    />
  );
};
