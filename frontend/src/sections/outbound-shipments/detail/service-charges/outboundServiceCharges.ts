// Outbound's wire twins for the shared service-charges editor (spec S5 hosts
// src/domain/invoice ServiceChargesModal): fetch the shipment's SERVICE lines
// and land the editor's batch on batchOutboundShipment. The batch's per-op
// rejections are typed — every failure description is joined for the editor's
// inline alert; a transport failure is already surfaced globally (ok: false,
// no message).
import { graphqlFetch } from '../../../../api/graphql';
import { t } from '../../../../intl';
import type {
  ServiceChargeBatch,
  ServiceChargeSaveResult,
  ServiceChargeSeed,
} from '../../../../domain/invoice';
import { OutboundLines } from '../outboundDetail.generated';
import { SaveOutboundServiceLines } from './serviceCharges.generated';

export const fetchOutboundServiceCharges = async (
  storeId: string,
  invoiceId: string
): Promise<ServiceChargeSeed[] | undefined> => {
  const result = await graphqlFetch(OutboundLines, {
    storeId,
    filter: { invoiceId: { equalTo: invoiceId }, type: { equalTo: 'SERVICE' } },
    page: { first: 100 },
  });
  if (result.kind !== 'success') return undefined;
  return result.data.invoiceLines.nodes.map(line => ({
    id: line.id,
    itemId: line.itemId,
    name: line.itemName,
    totalBeforeTax: line.totalBeforeTax,
    taxPercentage: line.taxPercentage ?? null,
    note: line.note ?? null,
  }));
};

export const saveOutboundServiceCharges = async (
  storeId: string,
  invoiceId: string,
  batch: ServiceChargeBatch
): Promise<ServiceChargeSaveResult> => {
  const result = await graphqlFetch(SaveOutboundServiceLines, {
    storeId,
    inserts: batch.inserts.map(write => ({ ...write, invoiceId })),
    // Update takes tax as the TaxInput wrapper (`tax: { percentage }`), unlike
    // insert's flat `taxPercentage` — mirror the generated input shapes.
    updates: batch.updates.map(({ taxPercentage, ...write }) => ({
      ...write,
      tax: { percentage: taxPercentage },
    })),
    deletes: batch.deletes,
  });
  if (result.kind !== 'success') return { ok: false };
  const response = result.data.batchOutboundShipment;
  const failures = [
    ...(response.insertOutboundShipmentServiceLines ?? []),
    ...(response.updateOutboundShipmentServiceLines ?? []),
    ...(response.deleteOutboundShipmentServiceLines ?? []),
  ].filter(item => item.response.__typename.endsWith('Error'));
  if (failures.length > 0) {
    const descriptions = failures
      .map(item => item.response.error.description)
      .filter(description => description.length > 0);
    return {
      ok: false,
      message:
        descriptions.length > 0
          ? descriptions.join('\n')
          : t('error.cant-save'),
    };
  }
  return { ok: true };
};
