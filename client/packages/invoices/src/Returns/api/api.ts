import {
  GenerateCustomerReturnLinesInput,
  CustomerReturnInput,
  InvoiceNodeStatus,
  InvoiceNodeType,
  InvoiceSortFieldInput,
  SupplierReturnInput,
  RecordPatch,
  UpdateCustomerReturnInput,
  UpdateCustomerReturnLinesInput,
  UpdateCustomerReturnStatusInput,
  UpdateSupplierReturnInput,
  UpdateSupplierReturnLinesInput,
  UpdateSupplierReturnStatusInput,
} from '@common/types';
import {
  CustomerReturnRowFragment,
  SupplierReturnFragment,
  SupplierReturnRowFragment,
  Sdk,
} from './operations.generated';
import { FilterByWithBoolean, SortBy } from '@common/hooks';

type ListParams<T> = {
  first: number;
  offset: number;
  sortBy: SortBy<T>;
  filterBy: FilterByWithBoolean | null;
};

export type SupplierListParams = ListParams<SupplierReturnRowFragment>;
export type CustomerListParams = ListParams<CustomerReturnRowFragment>;

const supplierParsers = {
  toSortField: (
    sortBy: SortBy<SupplierReturnRowFragment>
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
  ): UpdateSupplierReturnStatusInput | undefined => {
    switch (status) {
      case undefined:
        return;
      case InvoiceNodeStatus.Picked:
        return UpdateSupplierReturnStatusInput.Picked;
      case InvoiceNodeStatus.Shipped:
        return UpdateSupplierReturnStatusInput.Shipped;
      default:
        throw new Error('Invalid status');
    }
  },
};

const customerParsers = {
  toSortField: (
    sortBy: SortBy<CustomerReturnRowFragment>
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
  ): UpdateCustomerReturnStatusInput | undefined => {
    switch (status) {
      case undefined:
        return;
      case InvoiceNodeStatus.Delivered:
        return UpdateCustomerReturnStatusInput.Delivered;
      case InvoiceNodeStatus.Verified:
        return UpdateCustomerReturnStatusInput.Verified;
      default:
        throw new Error('Invalid status');
    }
  },
};

export const getReturnsQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    listSupplier: async ({
      first,
      offset,
      sortBy,
      filterBy,
    }: SupplierListParams): Promise<{
      nodes: SupplierReturnRowFragment[];
      totalCount: number;
    }> => {
      const filter = {
        ...filterBy,
        type: { equalTo: InvoiceNodeType.SupplierReturn },
      };
      const result = await sdk.supplierReturns({
        first,
        offset,
        key: supplierParsers.toSortField(sortBy),
        desc: !!sortBy.isDesc,
        filter,
        storeId,
      });
      return result?.invoices;
    },
    listAllSupplier: async (
      sortBy: SortBy<SupplierReturnRowFragment>
    ): Promise<{
      nodes: SupplierReturnRowFragment[];
      totalCount: number;
    }> => {
      const filter = {
        type: { equalTo: InvoiceNodeType.SupplierReturn },
      };
      const result = await sdk.supplierReturns({
        key: supplierParsers.toSortField(sortBy),
        desc: !!sortBy.isDesc,
        filter,
        storeId,
      });
      return result?.invoices;
    },
    listCustomer: async ({
      first,
      offset,
      sortBy,
      filterBy,
    }: CustomerListParams): Promise<{
      nodes: CustomerReturnRowFragment[];
      totalCount: number;
    }> => {
      const filter = {
        ...filterBy,
        type: { equalTo: InvoiceNodeType.CustomerReturn },
      };
      const result = await sdk.customerReturns({
        first,
        offset,
        key: customerParsers.toSortField(sortBy),
        desc: !!sortBy.isDesc,
        filter,
        storeId,
      });
      return result?.invoices;
    },
    listAllCustomer: async (
      sortBy: SortBy<CustomerReturnRowFragment>
    ): Promise<{
      nodes: CustomerReturnRowFragment[];
      totalCount: number;
    }> => {
      const filter = {
        type: { equalTo: InvoiceNodeType.CustomerReturn },
      };
      const result = await sdk.customerReturns({
        key: customerParsers.toSortField(sortBy),
        desc: !!sortBy.isDesc,
        filter,
        storeId,
      });
      return result?.invoices;
    },
    supplierReturnLines: async (
      stockLineIds: string[],
      itemId?: string,
      returnId?: string
    ) => {
      const result = await sdk.generateSupplierReturnLines({
        storeId,
        input: {
          stockLineIds,
          itemId,
          returnId,
        },
      });

      return result?.generateSupplierReturnLines;
    },
    generateCustomerReturnLines: async (
      input: GenerateCustomerReturnLinesInput
    ) => {
      const result = await sdk.generateCustomerReturnLines({
        input,
        storeId,
      });

      return result?.generateCustomerReturnLines;
    },
    supplierReturnByNumber: async (invoiceNumber: number) => {
      const result = await sdk.supplierReturnByNumber({
        invoiceNumber,
        storeId,
      });

      const invoice = result?.invoiceByNumber;

      if (invoice.__typename === 'InvoiceNode') {
        return invoice;
      }
    },
    customerReturnByNumber: async (invoiceNumber: number) => {
      const result = await sdk.customerReturnByNumber({
        invoiceNumber,
        storeId,
      });

      const invoice = result?.invoiceByNumber;

      if (invoice.__typename === 'InvoiceNode') {
        return invoice;
      }

      throw new Error('Could not get customer return');
    },
  },
  insertSupplierReturn: async (input: SupplierReturnInput) => {
    const result = await sdk.insertSupplierReturn({
      input,
      storeId,
    });

    const { insertSupplierReturn } = result;

    if (insertSupplierReturn.__typename === 'InvoiceNode') {
      return insertSupplierReturn.invoiceNumber;
    }

    throw new Error('Could not insert supplier return');
  },
  updateSupplierReturn: async (
    input: Omit<UpdateSupplierReturnInput, 'status'> & {
      status?: InvoiceNodeStatus;
    }
  ) => {
    const result = await sdk.updateSupplierReturn({
      input: {
        ...input,
        status: supplierParsers.toUpdateStatusInput(input.status),
      },
      storeId,
    });

    const { updateSupplierReturn } = result;

    if (updateSupplierReturn.__typename === 'InvoiceNode') {
      return updateSupplierReturn;
    }

    throw new Error('Could not update supplier return');
  },
  updateOtherParty: async (
    patch:
      | RecordPatch<SupplierReturnRowFragment>
      | RecordPatch<SupplierReturnFragment>
  ) => {
    const result =
      (await sdk.updateSupplierReturnOtherParty({
        storeId,
        input: {
          id: patch.id,
          otherPartyId: patch.otherPartyId,
        },
      })) || {};

    const { updateSupplierReturnOtherParty } = result;

    if (updateSupplierReturnOtherParty?.__typename === 'InvoiceNode') {
      return updateSupplierReturnOtherParty.id;
    }

    throw new Error('Could not update supplier name');
  },
  updateSupplierReturnLines: async (input: UpdateSupplierReturnLinesInput) => {
    const result = await sdk.updateSupplierReturnLines({
      input,
      storeId,
    });

    const { updateSupplierReturnLines } = result;

    if (updateSupplierReturnLines.__typename === 'InvoiceNode') {
      return updateSupplierReturnLines;
    }

    throw new Error('Could not update supplier return');
  },

  deleteSupplier: async (id: string): Promise<string> => {
    const result = await sdk.deleteSupplierReturn({
      storeId,
      id,
    });

    const { deleteSupplierReturn } = result;

    if (deleteSupplierReturn.__typename === 'DeleteResponse') {
      return deleteSupplierReturn.id;
    }

    // TODO: handle error response...
    throw new Error('Could not delete supplier return');
  },

  insertCustomerReturn: async (input: CustomerReturnInput) => {
    const result = await sdk.insertCustomerReturn({
      input,
      storeId,
    });

    const { insertCustomerReturn } = result;

    if (insertCustomerReturn.__typename === 'InvoiceNode') {
      return insertCustomerReturn.invoiceNumber;
    }

    throw new Error('Could not insert customer return');
  },

  updateCustomerReturn: async (
    input: Omit<UpdateCustomerReturnInput, 'status'> & {
      status?: InvoiceNodeStatus;
    }
  ) => {
    const result = await sdk.updateCustomerReturn({
      input: {
        ...input,
        status: customerParsers.toUpdateStatusInput(input.status),
      },
      storeId,
    });

    const { updateCustomerReturn } = result;

    if (updateCustomerReturn.__typename === 'InvoiceNode') {
      return updateCustomerReturn;
    }

    throw new Error('Could not update customer return');
  },

  updateCustomerReturnLines: async (input: UpdateCustomerReturnLinesInput) => {
    const result = await sdk.updateCustomerReturnLines({
      input,
      storeId,
    });

    const { updateCustomerReturnLines } = result;

    if (updateCustomerReturnLines.__typename === 'InvoiceNode') {
      return updateCustomerReturnLines;
    }

    throw new Error('Could not update customer return');
  },

  deleteCustomer: async (id: string): Promise<string> => {
    const result = await sdk.deleteCustomerReturn({
      storeId,
      id,
    });

    const { deleteCustomerReturn } = result;

    if (deleteCustomerReturn.__typename === 'DeleteResponse') {
      return deleteCustomerReturn.id;
    }

    // TODO: handle error response...
    throw new Error('Could not delete customer return');
  },
});
