import {
  InvoiceLineNodeType,
  RecordPatch,
  InvoiceNodeType,
  InvoiceTypeInput,
  InvoiceSortFieldInput,
  FilterBy,
  SortBy,
  InvoiceNodeStatus,
  UpdateInboundShipmentLineInput,
  InsertInboundShipmentLineInput,
  DeleteInboundShipmentLineInput,
  UpdateInboundShipmentInput,
  UpdateInboundShipmentStatusInput,
  setNullableInput,
  InsertInboundShipmentServiceLineInput,
  UpdateInboundShipmentServiceLineInput,
  DeleteInboundShipmentServiceLineInput,
  RequisitionSortFieldInput,
  RequisitionNodeType,
  InsertInboundShipmentLineFromInternalOrderLineInput,
  RequisitionNodeStatus,
  UpdateDonorInput,
  PurchaseOrderNodeStatus,
} from '@openmsupply-client/common';
import { DraftInboundLine } from './../../types';
import { isA, isInboundPlaceholderRow } from '../../utils';
import {
  Sdk,
  InboundFragment,
  InboundRowFragment,
  InsertInboundShipmentMutationVariables,
  InboundLineFragment,
} from './operations.generated';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<InboundRowFragment>;
  filterBy: FilterBy | null;
  type?: InvoiceTypeInput;
};

export const inboundParsers = {
  toStatus: (
    patch: RecordPatch<InboundFragment> | RecordPatch<InboundRowFragment>
  ): UpdateInboundShipmentStatusInput | undefined => {
    switch (patch.status) {
      case InvoiceNodeStatus.Shipped:
        return UpdateInboundShipmentStatusInput.Shipped;
      case InvoiceNodeStatus.Verified:
        return UpdateInboundShipmentStatusInput.Verified;
      case InvoiceNodeStatus.Delivered:
        return UpdateInboundShipmentStatusInput.Delivered;
      case InvoiceNodeStatus.Received:
        return UpdateInboundShipmentStatusInput.Received;
      default:
        return undefined;
    }
  },
  toSortField: (sortBy: SortBy<InboundRowFragment>): InvoiceSortFieldInput => {
    switch (sortBy.key) {
      case 'createdDatetime': {
        return InvoiceSortFieldInput.CreatedDatetime;
      }
      case 'otherPartyName': {
        return InvoiceSortFieldInput.OtherPartyName;
      }
      case 'comment': {
        return InvoiceSortFieldInput.Comment;
      }
      case 'invoiceNumber': {
        return InvoiceSortFieldInput.InvoiceNumber;
      }
      case 'theirReference': {
        return InvoiceSortFieldInput.TheirReference;
      }
      case 'status':
      default: {
        return InvoiceSortFieldInput.Status;
      }
    }
  },
  toUpdate: (
    patch:
      | RecordPatch<InboundFragment>
      | RecordPatch<InboundRowFragment>
      | {
          id: string;
          defaultDonorUpdate: UpdateDonorInput;
        }
  ): UpdateInboundShipmentInput => {
    return {
      id: patch.id,
      colour: 'colour' in patch ? patch.colour : undefined,
      comment: 'comment' in patch ? patch.comment : undefined,
      deliveredDatetime:
        'deliveredDatetime' in patch ? patch.deliveredDatetime : undefined,
      status: inboundParsers.toStatus(patch),
      onHold: 'onHold' in patch ? patch.onHold : undefined,
      otherPartyId: 'otherParty' in patch ? patch.otherParty?.id : undefined,
      theirReference:
        'theirReference' in patch ? patch.theirReference : undefined,
      tax:
        'taxPercentage' in patch
          ? { percentage: patch.taxPercentage }
          : undefined,
      currencyId: 'currency' in patch ? patch.currency?.id : undefined,
      currencyRate: 'currencyRate' in patch ? patch.currencyRate : undefined,
      defaultDonor:
        'defaultDonorUpdate' in patch ? patch.defaultDonorUpdate : undefined,
    };
  },
  toInsertLine: (line: DraftInboundLine): InsertInboundShipmentLineInput => {
    return {
      id: line.id,
      itemId: line.item.id,
      batch: line.batch,
      costPricePerPack: line.costPricePerPack,
      sellPricePerPack: line.sellPricePerPack,
      expiryDate: line.expiryDate,
      manufactureDate: line.manufactureDate,
      packSize: line.packSize,
      numberOfPacks: line.numberOfPacks,
      invoiceId: line.invoiceId,
      location: setNullableInput('id', line.location),
      itemVariantId: 'itemVariant' in line ? line.itemVariant?.id : undefined,
      vvmStatusId: 'vvmStatus' in line ? line.vvmStatus?.id : undefined,
      donorId: line.donor?.id,
      manufacturerId: line.manufacturer?.id,
      campaignId: line.campaign?.id,
      programId: line.program?.id,
      note: line.note,
      shippedNumberOfPacks: line.shippedNumberOfPacks,
      volumePerPack: line.volumePerPack,
      shippedPackSize: line.shippedPackSize,
      purchaseOrderLineId: line.purchaseOrderLine?.id,
    };
  },
  toInsertLineFromInternalOrder: (line: {
    invoiceId: string;
    requisitionLineId: string;
  }): InsertInboundShipmentLineFromInternalOrderLineInput => {
    return {
      invoiceId: line.invoiceId,
      requisitionLineId: line.requisitionLineId,
    };
  },
  toUpdateLine: (line: DraftInboundLine): UpdateInboundShipmentLineInput => ({
    id: line.id,
    itemId: line.item.id,
    batch: line.batch,
    costPricePerPack: line.costPricePerPack,
    expiryDate: {
      value: line.expiryDate || null,
    },
    manufactureDate: {
      value: line.manufactureDate || null,
    },
    sellPricePerPack: line.sellPricePerPack,
    packSize: line.packSize,
    numberOfPacks: line.numberOfPacks,
    location: setNullableInput('id', line.location),
    itemVariantId: setNullableInput('id', line.itemVariant),
    vvmStatusId: 'vvmStatus' in line ? line.vvmStatus?.id : undefined,
    donorId: setNullableInput('donorId', { donorId: line.donor?.id ?? null }), // set to null if undefined, so value is cleared
    manufacturerId: setNullableInput('manufacturerId', {
      manufacturerId: line.manufacturer?.id ?? null,
    }),
    campaignId: setNullableInput('campaignId', {
      campaignId: line.campaign?.id ?? null,
    }),
    programId: setNullableInput('programId', {
      programId: line.program?.id ?? null,
    }),
    note: setNullableInput('note', { note: line.note ?? null }),
    shippedNumberOfPacks: line.shippedNumberOfPacks ?? null,
    volumePerPack: line.volumePerPack ?? null,
    shippedPackSize: line.shippedPackSize ?? null,
    status: line.status ?? null,
  }),
  toDeleteLine: (line: { id: string }): DeleteInboundShipmentLineInput => {
    return { id: line.id };
  },
  toInsertServiceCharge: (
    line: DraftInboundLine
  ): InsertInboundShipmentServiceLineInput => ({
    id: line.id,
    invoiceId: line.invoiceId,
    itemId: line.item.id,
    totalBeforeTax: line.totalBeforeTax,
    taxPercentage: line.taxPercentage,
    note: line.note,
  }),
  toUpdateServiceCharge: (
    line: DraftInboundLine
  ): UpdateInboundShipmentServiceLineInput => ({
    id: line.id,
    itemId: line.item.id,
    totalBeforeTax: line.totalBeforeTax,
    tax: { percentage: line.taxPercentage },
    note: line.note,
  }),
  toDeleteServiceCharge: (
    line: DraftInboundLine
  ): DeleteInboundShipmentServiceLineInput => ({
    id: line.id,
  }),
};

export const getInboundQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list: async ({ first, offset, sortBy, filterBy, type }: ListParams) => {
      const filter = {
        ...filterBy,
        type: { equalTo: InvoiceNodeType.InboundShipment },
      };

      const result = await sdk.invoices({
        first,
        offset,
        key: inboundParsers.toSortField(sortBy),
        desc: !!sortBy.isDesc,
        filter,
        storeId,
        type,
      });
      return result?.invoices;
    },
    listAll: async ({
      sortBy,
      type,
    }: {
      sortBy: SortBy<InboundRowFragment>;
      type?: InvoiceTypeInput;
    }) => {
      const filter = {
        type: { equalTo: InvoiceNodeType.InboundShipment },
      };

      const result = await sdk.invoices({
        key: inboundParsers.toSortField(sortBy),
        desc: !!sortBy.isDesc,
        filter,
        storeId,
        type,
      });
      return result?.invoices;
    },
    byId: async (id: string) => {
      const result = await sdk.invoice({ id, storeId });

      const invoice = result?.invoice;

      if (invoice?.__typename === 'InvoiceNode') {
        return invoice;
      }

      throw new Error(result?.invoice?.__typename || 'Could not find invoice!');
    },
    byNumber: async (invoiceNumber: string) => {
      const result = await sdk.inboundByNumber({
        invoiceNumber: Number(invoiceNumber),
        storeId,
      });

      const invoice = result?.invoiceByNumber;

      if (invoice?.__typename === 'InvoiceNode') {
        return invoice;
      }

      throw new Error('Could not find invoice!');
    },
    listInternalOrders: async (otherPartyId: string) => {
      const filter = {
        type: { equalTo: RequisitionNodeType.Request },
        status: { equalTo: RequisitionNodeStatus.Sent },
        otherPartyId: { equalTo: otherPartyId },
      };
      const result = await sdk.requests({
        storeId,
        sort: {
          key: RequisitionSortFieldInput.CreatedDatetime,
          desc: true,
        },
        filter,
      });
      return result?.requisitions;
    },
    listInternalOrderLines: async (requisitionId: string) => {
      const result = await sdk.request({
        storeId,
        id: requisitionId,
      });
      if (result?.requisition?.__typename === 'RequisitionNode') {
        return result.requisition;
      }
    },
    listSentPurchaseOrders: async (filterBy: FilterBy | null) => {
      const filter = {
        ...filterBy,
        status: { equalTo: PurchaseOrderNodeStatus.Sent },
      };
      const result = await sdk.purchaseOrders({
        storeId,
        filter,
      });
      return result?.purchaseOrders;
    },
  },
  delete: async (
    invoices: InboundRowFragment[],
    isExternal = false
  ): Promise<string[]> => {
    const variables = {
      storeId,
      deleteInboundShipments: invoices.map(invoice => ({ id: invoice.id })),
    };

    const batchInboundShipment = isExternal
      ? (await sdk.deleteInboundShipmentsExternal(variables))
          ?.batchInboundShipmentExternal
      : (await sdk.deleteInboundShipments(variables))?.batchInboundShipment;

    if (batchInboundShipment?.deleteInboundShipments) {
      return batchInboundShipment.deleteInboundShipments.map(({ id }) => id);
    }

    throw new Error('Could not delete invoices');
  },
  insert: async (
    patch: Omit<InsertInboundShipmentMutationVariables, 'storeId'>,
    isExternal = false
  ): Promise<string> => {
    const variables = {
      id: patch.id,
      otherPartyId: patch.otherPartyId,
      storeId,
      requisitionId: patch.requisitionId,
      purchaseOrderId: patch.purchaseOrderId,
      insertLinesFromPurchaseOrder: patch.insertLinesFromPurchaseOrder,
    };

    const insertResult = isExternal
      ? (await sdk.insertInboundShipmentExternal(variables))
          ?.insertInboundShipmentExternal
      : (await sdk.insertInboundShipment(variables))?.insertInboundShipment;

    if (insertResult?.__typename === 'InvoiceNode') {
      return insertResult.id;
    }

    throw new Error(
      (insertResult as any)?.error?.description ?? 'Could not create invoice'
    );
  },
  update: async (
    patch:
      | RecordPatch<InboundFragment>
      | RecordPatch<InboundRowFragment>
      | { id: string; defaultDonorUpdate: UpdateDonorInput },
    isExternal = false
  ) => {
    const variables = {
      input: inboundParsers.toUpdate(patch),
      storeId,
    };
    if (isExternal) {
      return sdk.updateInboundShipmentExternal(variables);
    }
    return sdk.updateInboundShipment(variables);
  },
  insertLinesFromInternalOrder: async (
    lines: { invoiceId: string; requisitionLineId: string }[],
    isExternal = false
  ) => {
    const variables = {
      storeId,
      input: {
        insertFromInternalOrderLines: lines.map(
          inboundParsers.toInsertLineFromInternalOrder
        ),
      },
    };

    if (isExternal) {
      const result =
        await sdk.insertLinesFromInternalOrderExternal(variables);
      return {
        batchInboundShipment: result.batchInboundShipmentExternal,
      };
    }
    return sdk.insertLinesFromInternalOrder(variables);
  },
  deleteLines: async (lines: { id: string }[], isExternal = false) => {
    const variables = {
      storeId,
      input: {
        deleteInboundShipmentLines: lines.map(inboundParsers.toDeleteLine),
      },
    };

    if (isExternal) {
      const result =
        await sdk.deleteInboundShipmentLinesExternal(variables);
      return {
        batchInboundShipment: result.batchInboundShipmentExternal,
      };
    }
    return sdk.deleteInboundShipmentLines(variables);
  },
  updateServiceTax: async ({
    lines,
    taxPercentage,
    type,
    isExternal = false,
  }: {
    lines: InboundLineFragment[];
    taxPercentage: number;
    type: InvoiceLineNodeType.StockIn | InvoiceLineNodeType.Service;
    isExternal?: boolean;
  }) => {
    const toUpdateServiceLine = (line: InboundLineFragment) =>
      inboundParsers.toUpdateServiceCharge({ ...line, taxPercentage });

    const input = {
      updateInboundShipmentServiceLines:
        type === InvoiceLineNodeType.Service
          ? lines.filter(isA.serviceLine).map(toUpdateServiceLine)
          : [],
    };

    const batchInboundShipment = isExternal
      ? (await sdk.upsertInboundShipmentExternal({ storeId, input }))
          ?.batchInboundShipmentExternal
      : (await sdk.upsertInboundShipment({ storeId, input }))
          ?.batchInboundShipment;

    if (batchInboundShipment?.__typename === 'BatchInboundShipmentResponse') {
      return batchInboundShipment;
    }

    throw new Error('Unable to update invoice');
  },
  updateLines: async (
    draftInboundLine: DraftInboundLine[],
    isExternal = false
  ) => {
    const input = {
      insertInboundShipmentLines: draftInboundLine
        .filter(
          line =>
            line.isCreated &&
            line.type === InvoiceLineNodeType.StockIn &&
            !isInboundPlaceholderRow(line)
        )
        .map(inboundParsers.toInsertLine),
      updateInboundShipmentLines: draftInboundLine
        .filter(
          ({ type, isCreated, isUpdated }) =>
            !isCreated && isUpdated && type === InvoiceLineNodeType.StockIn
        )
        .map(inboundParsers.toUpdateLine),
      insertInboundShipmentServiceLines: draftInboundLine
        .filter(
          ({ type, isCreated, isDeleted }) =>
            type === InvoiceLineNodeType.Service && !isDeleted && isCreated
        )
        .map(inboundParsers.toInsertServiceCharge),
      updateInboundShipmentServiceLines: draftInboundLine
        .filter(
          ({ type, isUpdated, isCreated, isDeleted }) =>
            type === InvoiceLineNodeType.Service &&
            !isDeleted &&
            !isCreated &&
            isUpdated
        )
        .map(inboundParsers.toUpdateServiceCharge),
      deleteInboundShipmentServiceLines: draftInboundLine
        .filter(
          ({ type, isCreated, isDeleted }) =>
            type === InvoiceLineNodeType.Service && isDeleted && !isCreated
        )
        .map(inboundParsers.toDeleteServiceCharge),
    };

    if (isExternal) {
      const result = await sdk.upsertInboundShipmentExternal({
        storeId,
        input,
      });
      // Normalize response so consumers can use the same field name
      return {
        batchInboundShipment: result.batchInboundShipmentExternal,
      };
    }

    return sdk.upsertInboundShipment({ storeId, input });
  },
  addFromMasterList: async ({
    shipmentId,
    masterListId,
  }: {
    shipmentId: string;
    masterListId: string;
  }) => {
    const result = await sdk.addToInboundShipmentFromMasterList({
      shipmentId,
      masterListId,
      storeId,
    });

    if (
      result.addToInboundShipmentFromMasterList.__typename ===
      'InvoiceLineConnector'
    ) {
      return result.addToInboundShipmentFromMasterList;
    }

    if (
      result.addToInboundShipmentFromMasterList.__typename ===
      'AddToInboundShipmentFromMasterListError'
    ) {
      throw new Error(
        result.addToInboundShipmentFromMasterList.error.__typename
      );
    }

    throw new Error('Could not add from master list');
  },
});
