// Inbound's wire twins for the shared service-charges editor (spec S6 hosts
// src/domain/invoice ServiceChargesModal): fetch the shipment's SERVICE lines
// and land the editor's batch on the batch twin (plain vs external — the
// runInboundBatch shim). Batch-level or per-line rejections surface as the
// editor's inline alert; a transport failure is already surfaced globally
// (ok: false, no message).
import { graphqlFetch } from '../../../../api/graphql';
import type {
  ServiceChargeBatch,
  ServiceChargeSaveResult,
  ServiceChargeSeed,
} from '../../../../domain/invoice';
import {
  InboundServiceLines,
  type InboundServiceLinesResult,
} from '../inboundShipmentDetail.generated';
import { runInboundBatch } from '../inboundShipmentUpdate';

export type InboundServiceLine = Extract<
  InboundServiceLinesResult['invoiceLines'],
  { __typename: 'InvoiceLineConnector' }
>['nodes'][number];

// The shipment's SERVICE lines; undefined when the read failed.
export const fetchInboundServiceLines = async (
  storeId: string,
  invoiceId: string
): Promise<InboundServiceLine[] | undefined> => {
  const result = await graphqlFetch(InboundServiceLines, {
    storeId,
    filter: { invoiceId: { equalTo: invoiceId }, type: { equalTo: 'SERVICE' } },
  });
  return result.kind === 'success' &&
    result.data.invoiceLines.__typename === 'InvoiceLineConnector'
    ? result.data.invoiceLines.nodes
    : undefined;
};

export const fetchInboundServiceCharges = async (
  storeId: string,
  invoiceId: string
): Promise<ServiceChargeSeed[] | undefined> =>
  (await fetchInboundServiceLines(storeId, invoiceId))?.map(line => ({
    id: line.id,
    itemId: line.itemId,
    name: line.itemName,
    totalBeforeTax: line.totalBeforeTax,
    taxPercentage: line.taxPercentage ?? null,
    note: line.note ?? null,
  }));

export const saveInboundServiceCharges = async (
  storeId: string,
  isExternal: boolean,
  invoiceId: string,
  batch: ServiceChargeBatch
): Promise<ServiceChargeSaveResult> => {
  const outcome = await runInboundBatch(storeId, isExternal, {
    insertInboundShipmentServiceLines: batch.inserts.map(write => ({
      ...write,
      invoiceId,
    })),
    // Update takes tax as the TaxInput wrapper (`tax: { percentage }`), unlike
    // insert's flat `taxPercentage` — mirror the generated input shapes.
    updateInboundShipmentServiceLines: batch.updates.map(
      ({ taxPercentage, ...write }) => ({
        ...write,
        tax: { percentage: taxPercentage },
      })
    ),
    deleteInboundShipmentServiceLines: batch.deletes,
  });
  if (!outcome) return { ok: false };
  if (outcome.message) return { ok: false, message: outcome.message };
  if (outcome.errors.size > 0)
    return { ok: false, message: [...outcome.errors.values()][0] };
  return { ok: true };
};
