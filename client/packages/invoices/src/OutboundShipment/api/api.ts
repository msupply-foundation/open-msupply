import { DraftOutboundLine } from './../../types';
import {
  DeleteOutboundShipmentLineInput,
  RecordPatch,
  UpdateOutboundShipmentInput,
  InvoiceNodeStatus,
  UpdateOutboundShipmentStatusInput,
  InsertOutboundShipmentLineInput,
  UpdateOutboundShipmentLineInput,
} from '@openmsupply-client/common';
import { Invoice, InvoiceLine } from '../../types';
import { getSdk, InvoiceQuery } from './operations.generated';

export type OutboundShipmentApi = ReturnType<typeof getSdk>;

const invoiceGuard = (invoiceQuery: InvoiceQuery) => {
  if (invoiceQuery.invoice.__typename === 'InvoiceNode') {
    return invoiceQuery.invoice;
  }

  throw new Error(invoiceQuery.invoice.error.description);
};

const getPatchStatus = (patch: RecordPatch<Invoice>) => {
  switch (patch.status) {
    case InvoiceNodeStatus.Allocated:
      return UpdateOutboundShipmentStatusInput.Allocated;
    case InvoiceNodeStatus.Picked:
      return UpdateOutboundShipmentStatusInput.Picked;
    case InvoiceNodeStatus.Shipped:
      return UpdateOutboundShipmentStatusInput.Shipped;
    default:
      return undefined;
  }
};

const invoiceToInput = (
  patch: RecordPatch<Invoice>
): UpdateOutboundShipmentInput => ({
  id: patch.id,
  colour: patch.colour,
  comment: patch.comment,
  status: getPatchStatus(patch),
  onHold: patch.onHold,
  otherPartyId: patch.otherParty?.id,
  theirReference: patch.theirReference,
});

const getCreateDeleteOutboundLineInput =
  (invoiceId: string) =>
  (id: string): DeleteOutboundShipmentLineInput => {
    return { id, invoiceId };
  };

const createInsertOutboundLineInput = (
  line: DraftOutboundLine
): InsertOutboundShipmentLineInput => {
  return {
    id: line.id,
    itemId: line.itemId,
    numberOfPacks: line.numberOfPacks,
    stockLineId: line.stockLineId,
    invoiceId: line.invoiceId,
    totalAfterTax: 0,
    totalBeforeTax: 0,
  };
};

const createUpdateOutboundLineInput = (
  line: DraftOutboundLine
): UpdateOutboundShipmentLineInput => {
  return {
    id: line.id,
    invoiceId: line.invoiceId,
    numberOfPacks: line.numberOfPacks,
    stockLineId: line.stockLineId,
  };
};

export const OutboundApi = {
  get: {
    byId:
      (api: OutboundShipmentApi, storeId: string) =>
      async (id: string): Promise<Invoice> => {
        const result = await api.invoice({ id, storeId });

        const invoice = invoiceGuard(result);
        const lineNodes = invoice.lines;
        const lines: InvoiceLine[] = lineNodes.nodes.map(line => {
          return {
            ...line,
            stockLineId: line.stockLine?.id ?? '',
            invoiceId: invoice.id,
            unitName: line.item?.unitName ?? '',
          };
        });

        return {
          ...invoice,
          lines,
        };
      },
  },
  update:
    (api: OutboundShipmentApi, storeId: string) =>
    async (patch: RecordPatch<Invoice>): Promise<RecordPatch<Invoice>> => {
      const result = await api.upsertOutboundShipment({
        storeId,
        input: {
          updateOutboundShipments: [invoiceToInput(patch)],
        },
      });

      const { batchOutboundShipment } = result;

      if (
        batchOutboundShipment.__typename === 'BatchOutboundShipmentResponse'
      ) {
        const { updateOutboundShipments } = batchOutboundShipment;
        if (
          updateOutboundShipments?.[0]?.__typename ===
          'UpdateOutboundShipmentResponseWithId'
        ) {
          return patch;
        }
      }

      throw new Error('Unable to update invoice');
    },
  updateLines:
    (api: OutboundShipmentApi, storeId: string) =>
    async (draftStocktakeLines: DraftOutboundLine[]) => {
      const input = {
        insertOutboundShipmentLines: draftStocktakeLines
          .filter(({ isCreated }) => isCreated)
          .map(createInsertOutboundLineInput),
        updateOutboundShipmentLines: draftStocktakeLines
          .filter(({ isCreated, isUpdated }) => !isCreated && isUpdated)
          .map(createUpdateOutboundLineInput),
      };

      const result = await api.upsertOutboundShipment({ storeId, input });

      return result;
    },
  deleteLines:
    (api: OutboundShipmentApi, invoiceId: string, storeId: string) =>
    async (ids: string[]) => {
      const createDeleteLineInput = getCreateDeleteOutboundLineInput(invoiceId);
      return api.deleteOutboundShipmentLines({
        storeId,
        deleteOutboundShipmentLines: ids.map(createDeleteLineInput),
      });
    },
};
