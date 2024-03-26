import {
  GenerateInboundReturnLinesInput,
  InboundReturnInput,
  InvoiceNodeStatus,
  InvoiceNodeType,
  InvoiceSortFieldInput,
  OutboundReturnInput,
  UpdateInboundReturnInput,
  UpdateInboundReturnLinesInput,
  UpdateInboundReturnStatusInput,
  UpdateOutboundReturnInput,
  UpdateOutboundReturnLinesInput,
  UpdateOutboundReturnStatusInput,
} from '@common/types';
import {
  InboundReturnRowFragment,
  OutboundReturnRowFragment,
  Sdk,
} from './operations.generated';
import { FilterByWithBoolean, SortBy } from '@common/hooks';

type ListParams<T> = {
  first: number;
  offset: number;
  sortBy: SortBy<T>;
  filterBy: FilterByWithBoolean | null;
};

export type OutboundListParams = ListParams<OutboundReturnRowFragment>;
export type InboundListParams = ListParams<InboundReturnRowFragment>;

const outboundParsers = {
  toSortField: (
    sortBy: SortBy<OutboundReturnRowFragment>
  ): InvoiceSortFieldInput => {
    switch (sortBy.key) {
      case 'createdDatetime': {
        return InvoiceSortFieldInput.CreatedDatetime;
      }
      case 'otherPartyName': {
        return InvoiceSortFieldInput.OtherPartyName;
      }
      case 'invoiceNumber': {
        return InvoiceSortFieldInput.InvoiceNumber;
      }
      case 'status':
      default: {
        return InvoiceSortFieldInput.Status;
      }
    }
  },

  toUpdateStatusInput: (
    status: InvoiceNodeStatus | undefined
  ): UpdateOutboundReturnStatusInput | undefined => {
    switch (status) {
      case undefined:
        return;
      case InvoiceNodeStatus.Picked:
        return UpdateOutboundReturnStatusInput.Picked;
      case InvoiceNodeStatus.Shipped:
        return UpdateOutboundReturnStatusInput.Shipped;
      default:
        throw new Error('Invalid status');
    }
  },
};

const inboundParsers = {
  toSortField: (
    sortBy: SortBy<InboundReturnRowFragment>
  ): InvoiceSortFieldInput => {
    switch (sortBy.key) {
      case 'createdDatetime': {
        return InvoiceSortFieldInput.CreatedDatetime;
      }
      case 'deliveredDatetime': {
        return InvoiceSortFieldInput.DeliveredDatetime;
      }
      case 'otherPartyName': {
        return InvoiceSortFieldInput.OtherPartyName;
      }
      case 'invoiceNumber': {
        return InvoiceSortFieldInput.InvoiceNumber;
      }
      case 'status':
      default: {
        return InvoiceSortFieldInput.Status;
      }
    }
  },

  toUpdateStatusInput: (
    status: InvoiceNodeStatus | undefined
  ): UpdateInboundReturnStatusInput | undefined => {
    switch (status) {
      case undefined:
        return;
      case InvoiceNodeStatus.Delivered:
        return UpdateInboundReturnStatusInput.Delivered;
      case InvoiceNodeStatus.Verified:
        return UpdateInboundReturnStatusInput.Verified;
      default:
        throw new Error('Invalid status');
    }
  },
};

export const getReturnsQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    listOutbound: async ({
      first,
      offset,
      sortBy,
      filterBy,
    }: OutboundListParams): Promise<{
      nodes: OutboundReturnRowFragment[];
      totalCount: number;
    }> => {
      const filter = {
        ...filterBy,
        type: { equalTo: InvoiceNodeType.OutboundReturn },
      };
      const result = await sdk.outboundReturns({
        first,
        offset,
        key: outboundParsers.toSortField(sortBy),
        desc: !!sortBy.isDesc,
        filter,
        storeId,
      });
      return result?.invoices;
    },
    listAllOutbound: async (
      sortBy: SortBy<OutboundReturnRowFragment>
    ): Promise<{
      nodes: OutboundReturnRowFragment[];
      totalCount: number;
    }> => {
      const filter = {
        type: { equalTo: InvoiceNodeType.OutboundReturn },
      };
      const result = await sdk.outboundReturns({
        key: outboundParsers.toSortField(sortBy),
        desc: !!sortBy.isDesc,
        filter,
        storeId,
      });
      return result?.invoices;
    },
    listInbound: async ({
      first,
      offset,
      sortBy,
      filterBy,
    }: InboundListParams): Promise<{
      nodes: InboundReturnRowFragment[];
      totalCount: number;
    }> => {
      const filter = {
        ...filterBy,
        type: { equalTo: InvoiceNodeType.InboundReturn },
      };
      const result = await sdk.inboundReturns({
        first,
        offset,
        key: inboundParsers.toSortField(sortBy),
        desc: !!sortBy.isDesc,
        filter,
        storeId,
      });
      return result?.invoices;
    },
    listAllInbound: async (
      sortBy: SortBy<InboundReturnRowFragment>
    ): Promise<{
      nodes: InboundReturnRowFragment[];
      totalCount: number;
    }> => {
      const filter = {
        type: { equalTo: InvoiceNodeType.InboundReturn },
      };
      const result = await sdk.outboundReturns({
        key: inboundParsers.toSortField(sortBy),
        desc: !!sortBy.isDesc,
        filter,
        storeId,
      });
      return result?.invoices;
    },
    outboundReturnLines: async (
      stockLineIds: string[],
      itemId?: string,
      returnId?: string
    ) => {
      const result = await sdk.generateOutboundReturnLines({
        storeId,
        input: {
          stockLineIds,
          itemId,
          returnId,
        },
      });

      return result?.generateOutboundReturnLines;
    },
    generateInboundReturnLines: async (
      input: GenerateInboundReturnLinesInput
    ) => {
      const result = await sdk.generateInboundReturnLines({
        input,
        storeId,
      });

      return result?.generateInboundReturnLines;
    },
    outboundReturnByNumber: async (invoiceNumber: number) => {
      const result = await sdk.outboundReturnByNumber({
        invoiceNumber,
        storeId,
      });

      const invoice = result?.invoiceByNumber;

      if (invoice.__typename === 'InvoiceNode') {
        return invoice;
      }
    },
    inboundReturnByNumber: async (invoiceNumber: number) => {
      const result = await sdk.inboundReturnByNumber({
        invoiceNumber,
        storeId,
      });

      const invoice = result?.invoiceByNumber;

      if (invoice.__typename === 'InvoiceNode') {
        return invoice;
      }

      throw new Error('Could not get inbound return');
    },
  },
  insertOutboundReturn: async (input: OutboundReturnInput) => {
    const result = await sdk.insertOutboundReturn({
      input,
      storeId,
    });

    const { insertOutboundReturn } = result;

    if (insertOutboundReturn.__typename === 'InvoiceNode') {
      return insertOutboundReturn.invoiceNumber;
    }

    throw new Error('Could not insert outbound return');
  },
  updateOutboundReturn: async (
    input: Omit<UpdateOutboundReturnInput, 'status'> & {
      status?: InvoiceNodeStatus;
    }
  ) => {
    const result = await sdk.updateOutboundReturn({
      input: {
        ...input,
        status: outboundParsers.toUpdateStatusInput(input.status),
      },
      storeId,
    });

    const { updateOutboundReturn } = result;

    if (updateOutboundReturn.__typename === 'InvoiceNode') {
      return updateOutboundReturn;
    }

    throw new Error('Could not update outbound return');
  },
  updateOutboundReturnLines: async (input: UpdateOutboundReturnLinesInput) => {
    const result = await sdk.updateOutboundReturnLines({
      input,
      storeId,
    });

    const { updateOutboundReturnLines } = result;

    if (updateOutboundReturnLines.__typename === 'InvoiceNode') {
      return updateOutboundReturnLines;
    }

    throw new Error('Could not update outbound return');
  },

  deleteOutbound: async (id: string): Promise<string> => {
    const result = await sdk.deleteOutboundReturn({
      storeId,
      id,
    });

    const { deleteOutboundReturn } = result;

    if (deleteOutboundReturn.__typename === 'DeleteResponse') {
      return deleteOutboundReturn.id;
    }

    // TODO: handle error response...
    throw new Error('Could not delete outbound return');
  },

  insertInboundReturn: async (input: InboundReturnInput) => {
    const result = await sdk.insertInboundReturn({
      input,
      storeId,
    });

    const { insertInboundReturn } = result;

    if (insertInboundReturn.__typename === 'InvoiceNode') {
      return insertInboundReturn.invoiceNumber;
    }

    throw new Error('Could not insert inbound return');
  },

  updateInboundReturn: async (
    input: Omit<UpdateInboundReturnInput, 'status'> & {
      status?: InvoiceNodeStatus;
    }
  ) => {
    const result = await sdk.updateInboundReturn({
      input: {
        ...input,
        status: inboundParsers.toUpdateStatusInput(input.status),
      },
      storeId,
    });

    const { updateInboundReturn } = result;

    if (updateInboundReturn.__typename === 'InvoiceNode') {
      return updateInboundReturn;
    }

    throw new Error('Could not update inbound return');
  },

  updateInboundReturnLines: async (input: UpdateInboundReturnLinesInput) => {
    const result = await sdk.updateInboundReturnLines({
      input,
      storeId,
    });

    const { updateInboundReturnLines } = result;

    if (updateInboundReturnLines.__typename === 'InvoiceNode') {
      return updateInboundReturnLines;
    }

    throw new Error('Could not update inbound return');
  },

  deleteInbound: async (id: string): Promise<string> => {
    const result = await sdk.deleteInboundReturn({
      storeId,
      id,
    });

    const { deleteInboundReturn } = result;

    if (deleteInboundReturn.__typename === 'DeleteResponse') {
      return deleteInboundReturn.id;
    }

    // TODO: handle error response...
    throw new Error('Could not delete inbound return');
  },
});
