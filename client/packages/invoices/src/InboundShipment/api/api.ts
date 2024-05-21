import {
  InvoiceLineNodeType,
  RecordPatch,
  InvoiceNodeType,
  InvoiceSortFieldInput,
  FilterByWithBoolean,
  SortBy,
  InvoiceNodeStatus,
  UpdateInboundShipmentLineInput,
  InsertInboundShipmentLineInput,
  DeleteInboundShipmentLineInput,
  UpdateInboundShipmentInput,
  Formatter,
  UpdateInboundShipmentStatusInput,
  setNullableInput,
  InsertInboundShipmentServiceLineInput,
  UpdateInboundShipmentServiceLineInput,
  DeleteInboundShipmentServiceLineInput,
} from '@openmsupply-client/common';
import { DraftInboundLine } from './../../types';
import { isA } from '../../utils';
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
  filterBy: FilterByWithBoolean | null;
};

const inboundParsers = {
  toStatus: (
    patch: RecordPatch<InboundFragment> | RecordPatch<InboundRowFragment>
  ): UpdateInboundShipmentStatusInput | undefined => {
    switch (patch.status) {
      case InvoiceNodeStatus.Verified:
        return UpdateInboundShipmentStatusInput.Verified;
      case InvoiceNodeStatus.Delivered:
        return UpdateInboundShipmentStatusInput.Delivered;
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
    patch: RecordPatch<InboundFragment> | RecordPatch<InboundRowFragment>
  ): UpdateInboundShipmentInput => {
    return {
      id: patch.id,
      colour: patch.colour,
      comment: patch.comment,
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
    };
  },
  toInsertLine: (line: DraftInboundLine): InsertInboundShipmentLineInput => {
    return {
      id: line.id,
      itemId: line.item.id,
      batch: line.batch,
      costPricePerPack: line.costPricePerPack,
      sellPricePerPack: line.sellPricePerPack,
      expiryDate: line.expiryDate
        ? Formatter.naiveDate(new Date(line.expiryDate))
        : null,
      packSize: line.packSize,
      numberOfPacks: line.numberOfPacks,
      invoiceId: line.invoiceId,
      location: setNullableInput('id', line.location),
    };
  },
  toUpdateLine: (line: DraftInboundLine): UpdateInboundShipmentLineInput => ({
    id: line.id,
    itemId: line.item.id,
    batch: line.batch,
    costPricePerPack: line.costPricePerPack,
    expiryDate: line.expiryDate
      ? Formatter.naiveDate(new Date(line.expiryDate))
      : null,
    sellPricePerPack: line.sellPricePerPack,
    packSize: line.packSize,
    numberOfPacks: line.numberOfPacks,
    location: setNullableInput('id', line.location),
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
    list: async ({ first, offset, sortBy, filterBy }: ListParams) => {
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
      });
      return result?.invoices;
    },
    listAll: async ({ sortBy }: { sortBy: SortBy<InboundRowFragment> }) => {
      const filter = {
        type: { equalTo: InvoiceNodeType.InboundShipment },
      };

      const result = await sdk.invoices({
        key: inboundParsers.toSortField(sortBy),
        desc: !!sortBy.isDesc,
        filter,
        storeId,
      });
      return result?.invoices;
    },
    byId: async (id: string): Promise<InboundRowFragment> => {
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
  },
  delete: async (invoices: InboundRowFragment[]): Promise<string[]> => {
    const result =
      (await sdk.deleteInboundShipments({
        storeId,
        deleteInboundShipments: invoices.map(invoice => ({ id: invoice.id })),
      })) || {};

    const { batchInboundShipment } = result;

    if (batchInboundShipment?.deleteInboundShipments) {
      return batchInboundShipment.deleteInboundShipments.map(({ id }) => id);
    }

    throw new Error('Could not delete invoices');
  },
  insert: async (
    patch: Omit<InsertInboundShipmentMutationVariables, 'storeId'>
  ): Promise<number> => {
    const result =
      (await sdk.insertInboundShipment({
        id: patch.id,
        otherPartyId: patch.otherPartyId,
        storeId,
      })) || {};

    const { insertInboundShipment } = result;

    if (insertInboundShipment?.__typename === 'InvoiceNode') {
      return insertInboundShipment.invoiceNumber;
    }

    throw new Error(insertInboundShipment.error.description);
  },
  update: async (
    patch: RecordPatch<InboundFragment> | RecordPatch<InboundRowFragment>
  ) =>
    sdk.updateInboundShipment({
      input: inboundParsers.toUpdate(patch),
      storeId,
    }),
  deleteLines: async (lines: { id: string }[]) => {
    return sdk.deleteInboundShipmentLines({
      storeId,
      input: {
        deleteInboundShipmentLines: lines.map(inboundParsers.toDeleteLine),
      },
    });
  },
  updateServiceTax: async ({
    lines,
    taxPercentage,
    type,
  }: {
    lines: InboundLineFragment[];
    taxPercentage: number;
    type: InvoiceLineNodeType.StockIn | InvoiceLineNodeType.Service;
  }) => {
    const toUpdateServiceLine = (line: InboundLineFragment) =>
      inboundParsers.toUpdateServiceCharge({ ...line, taxPercentage });

    const result =
      (await sdk.upsertInboundShipment({
        storeId,
        input: {
          updateInboundShipmentServiceLines:
            type === InvoiceLineNodeType.Service
              ? lines.filter(isA.serviceLine).map(toUpdateServiceLine)
              : [],
        },
      })) || {};

    const { batchInboundShipment } = result;

    if (batchInboundShipment?.__typename === 'BatchInboundShipmentResponse') {
      return batchInboundShipment;
    }

    throw new Error('Unable to update invoice');
  },
  updateLines: async (draftInboundLine: DraftInboundLine[]) => {
    const input = {
      insertInboundShipmentLines: draftInboundLine
        .filter(
          ({ type, isCreated, numberOfPacks }) =>
            isCreated &&
            type === InvoiceLineNodeType.StockIn &&
            numberOfPacks > 0
        )
        .map(inboundParsers.toInsertLine),
      updateInboundShipmentLines: draftInboundLine
        .filter(
          ({ type, isCreated, isUpdated }) =>
            !isCreated && isUpdated && type === InvoiceLineNodeType.StockIn
        )
        .map(inboundParsers.toUpdateLine),
      deleteInboundShipmentLines: draftInboundLine
        .filter(
          ({ type, isCreated, isDeleted }) =>
            !isCreated && isDeleted && type === InvoiceLineNodeType.StockIn
        )
        .map(inboundParsers.toDeleteLine),
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

    const result = await sdk.upsertInboundShipment({ storeId, input });

    return result;
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
