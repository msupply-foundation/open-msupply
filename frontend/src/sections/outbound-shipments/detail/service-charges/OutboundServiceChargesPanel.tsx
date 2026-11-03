import type { Component } from 'solid-js';
import {
  ServiceChargesTable,
  type ServiceChargeBatch,
  type ServiceChargesEditor,
  type ServiceItem,
} from '@/domain/invoice';
import {
  fetchOutboundServiceCharges,
  fetchOutboundServiceLines,
  saveOutboundServiceCharges,
} from './outboundServiceCharges';

// The detail "Service charges" tab (spec S3 tabs → Service charges).
export const OutboundServiceChargesPanel: Component<{
  storeId: string;
  invoiceId: string;
  disabled: boolean;
  serviceItems: ServiceItem[] | undefined;
  editor: ServiceChargesEditor | undefined;
  onEditorChange: (editor: ServiceChargesEditor | undefined) => void;
  onChanged: () => void;
}> = props => {
  const save = (batch: ServiceChargeBatch) =>
    saveOutboundServiceCharges(props.storeId, props.invoiceId, batch);
  return (
    <ServiceChargesTable
      storeId={props.storeId}
      invoiceId={props.invoiceId}
      disabled={props.disabled}
      serviceItems={props.serviceItems}
      editor={props.editor}
      onEditorChange={props.onEditorChange}
      fetchLines={invoiceId =>
        fetchOutboundServiceLines(props.storeId, invoiceId)
      }
      fetchCharges={() =>
        fetchOutboundServiceCharges(props.storeId, props.invoiceId)
      }
      save={save}
      deleteLine={line =>
        save({ inserts: [], updates: [], deletes: [{ id: line.id }] })
      }
      onChanged={props.onChanged}
    />
  );
};
