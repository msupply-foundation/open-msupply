import { DraftOutboundLine } from './../../types';
import {
  UpdateOutboundShipmentUnallocatedLineInput,
  InsertOutboundShipmentUnallocatedLineInput,
  DeleteOutboundShipmentLineInput,
  RecordPatch,
  UpdateOutboundShipmentInput,
  InvoiceNodeStatus,
  UpdateOutboundShipmentStatusInput,
  InsertOutboundShipmentLineInput,
  UpdateOutboundShipmentLineInput,
  InvoiceLineNodeType,
} from '@openmsupply-client/common';
import { Invoice, InvoiceLine } from '../../types';
import { getSdk } from './operations.generated';

export type OutboundShipmentApi = ReturnType<typeof getSdk>;

const outboundParsers = {
  toUpdate: (patch: RecordPatch<Invoice>): UpdateOutboundShipmentInput => ({
    id: patch.id,
    colour: patch.colour,
    comment: patch.comment,
    status: getPatchStatus(patch),
    onHold: patch.onHold,
    otherPartyId: patch.otherParty?.id,
    theirReference: patch.theirReference,
  }),
  toInsertLine: (line: DraftOutboundLine): InsertOutboundShipmentLineInput => {
    return {
      id: line.id,
      itemId: line.itemId,
      numberOfPacks: line.numberOfPacks,
      stockLineId: line.stockLineId,
      invoiceId: line.invoiceId,
      totalAfterTax: 0,
      totalBeforeTax: 0,
    };
  },
  toUpdateLine: (line: DraftOutboundLine): UpdateOutboundShipmentLineInput => {
    return {
      id: line.id,
      invoiceId: line.invoiceId,
      numberOfPacks: line.numberOfPacks,
      stockLineId: line.stockLineId,
    };
  },
  toInsertPlaceholder: (
    line: DraftOutboundLine
  ): InsertOutboundShipmentUnallocatedLineInput => ({
    id: line.id,
    quantity: line.numberOfPacks,
    invoiceId: line.invoiceId,
    itemId: line.itemId,
  }),
  toUpdatePlaceholder: (
    line: DraftOutboundLine
  ): UpdateOutboundShipmentUnallocatedLineInput => ({
    id: line.id,
    quantity: line.numberOfPacks,
  }),
  toDeleteLine: (
    invoiceId: string,
    id: string
  ): DeleteOutboundShipmentLineInput => ({
    invoiceId,
    id,
  }),
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

export const OutboundApi = {
  get: {
    byId:
      (api: OutboundShipmentApi, storeId: string) =>
      async (id: string): Promise<Invoice> => {
        const result = await api.invoice({ id, storeId });
        const invoice = result.invoice;

        if (invoice.__typename === 'InvoiceNode') {
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
        } else {
          throw new Error('Could not find invoice');
        }
      },
  },
  update:
    (api: OutboundShipmentApi, storeId: string) =>
    async (patch: RecordPatch<Invoice>): Promise<RecordPatch<Invoice>> => {
      const result = await api.upsertOutboundShipment({
        storeId,
        input: {
          updateOutboundShipments: [outboundParsers.toUpdate(patch)],
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
      const filtered = draftStocktakeLines.filter(
        ({ numberOfPacks }) => numberOfPacks > 0
      );
      const input = {
        insertOutboundShipmentLines: filtered
          .filter(
            ({ type, isCreated }) =>
              isCreated && type === InvoiceLineNodeType.StockOut
          )
          .map(outboundParsers.toInsertLine),
        updateOutboundShipmentLines: filtered
          .filter(
            ({ type, isCreated, isUpdated }) =>
              !isCreated && isUpdated && type === InvoiceLineNodeType.StockOut
          )
          .map(outboundParsers.toUpdateLine),
        insertOutboundShipmentUnallocatedLines: filtered
          .filter(
            ({ type, isCreated }) =>
              type === InvoiceLineNodeType.UnallocatedStock && isCreated
          )
          .map(outboundParsers.toInsertPlaceholder),
        updateOutboundShipmentUnallocatedLines: filtered
          .filter(
            ({ type, isCreated, isUpdated }) =>
              type === InvoiceLineNodeType.UnallocatedStock &&
              !isCreated &&
              isUpdated
          )
          .map(outboundParsers.toUpdatePlaceholder),
      };

      const result = await api.upsertOutboundShipment({ storeId, input });

      return result;
    },
  deleteLines:
    (api: OutboundShipmentApi, invoiceId: string, storeId: string) =>
    async (ids: string[]) => {
      return api.deleteOutboundShipmentLines({
        storeId,
        deleteOutboundShipmentLines: ids.map(id =>
          outboundParsers.toDeleteLine(invoiceId, id)
        ),
      });
    },
};
