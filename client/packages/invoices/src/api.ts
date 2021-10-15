import { ObjectWithStringKeys } from '@openmsupply-client/common/src/types/utility';
import {
  request,
  gql,
  batchRequests,
  Name,
  SortBy,
  ListApi,
  Invoice,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';

import { OutboundShipment } from './OutboundShipment/DetailView/types';

export const getInsertInvoiceQuery = (): string => gql`
  mutation insertInvoice($invoice: InvoicePatch) {
    insertInvoice(invoice: $invoice) {
      id
      invoiceNumber
    }
  }
`;

export const createFn = async (invoice: Partial<Invoice>): Promise<Invoice> => {
  const result = await request(Environment.API_URL, getInsertInvoiceQuery(), {
    invoice,
  });
  const { insertInvoice } = result;

  return insertInvoice;
};

export const getDetailQuery = (): string => gql`
  query invoiceByInvoiceNumber($invoiceNumber: Int) {
    invoiceByInvoiceNumber(invoiceNumber: $invoiceNumber) {
      id
      color
      comment
      status
      type
      entered
      confirmed
      invoiceNumber
      total
      color
      name {
        id
        name
        code
      }
      lines {
        id
        itemCode
        itemName
        expiry
        quantity
      }
    }
  }
`;

export const getNameListQuery = (): string => gql`
  query names {
    names {
      data {
        id
        name
        code
        isCustomer
        isSupplier
      }
      totalLength
    }
  }
`;

export const getMutation = (): string => gql`
  mutation updateInvoice($invoicePatch: InvoicePatch) {
    updateInvoice(invoice: $invoicePatch) {
      id
      color
      comment
      status
      type
      entered
      confirmed
      invoiceNumber
      total
      color
      name
    }
  }
`;

export const getDeleteMutation = (): string => gql`
  mutation deleteInvoice($invoiceId: String) {
    deleteInvoice(invoiceId: $invoiceId) {
      id
    }
  }
`;

export const getListQuery = (): string => gql`
  query invoices($first: Int, $offset: Int, $sort: String, $desc: Boolean) {
    invoices(first: $first, offset: $offset, sort: $sort, desc: $desc) {
      data {
        id
        color
        comment
        status
        type
        entered
        confirmed
        invoiceNumber
        total
        otherPartyName
      }
      totalLength
    }
  }
`;

export const deleteFn = async (invoices: Invoice[]) => {
  await batchRequests(
    Environment.API_URL,
    invoices.map(invoice => ({
      document: getDeleteMutation(),
      variables: { invoiceId: invoice.id },
    }))
  );
};

export const nameListQueryFn = async (): Promise<{
  data: Name[];
  totalLength: number;
}> => {
  const { names } = await request(Environment.API_URL, getNameListQuery());
  return names;
};

export const listQueryFn = async <T extends ObjectWithStringKeys>(queryParams: {
  first: number;
  offset: number;
  sortBy: SortBy<T>;
}): Promise<{ data: Invoice[]; totalLength: number }> => {
  const { first, offset, sortBy } = queryParams;

  const { invoices } = await request(Environment.API_URL, getListQuery(), {
    first,
    offset,
    sort: sortBy.key,
    desc: sortBy.isDesc,
  });

  return invoices;
};

export const detailQueryFn =
  (invoiceNumber: number) => async (): Promise<Invoice> => {
    const result = await request(Environment.API_URL, getDetailQuery(), {
      invoiceNumber,
    });
    const { invoiceByInvoiceNumber } = result;

    return invoiceByInvoiceNumber;
  };

export const updateFn = async (updated: Invoice): Promise<Invoice> => {
  const patch = { invoicePatch: updated };
  const result = await request(Environment.API_URL, getMutation(), patch);
  const { updateInvoice } = result;
  return updateInvoice;
};

export const OutboundShipmentListViewApi: ListApi<Invoice> = {
  onQuery:
    ({ first, offset, sortBy }) =>
    () =>
      listQueryFn({ first, offset, sortBy }),
  onDelete: deleteFn,
  onUpdate: updateFn,
  onCreate: createFn,
};

interface Api<ReadType, UpdateType> {
  onRead: () => Promise<ReadType>;
  onUpdate: (val: UpdateType) => Promise<ReadType>;
}

export const getOutboundShipmentDetailViewApi: (
  invoiceNumber: number
) => Api<Invoice, OutboundShipment> = (invoiceNumber: number) => ({
  onRead: detailQueryFn(invoiceNumber),
  onUpdate: async (outboundShipment: OutboundShipment): Promise<Invoice> => {
    const result = await updateFn(outboundShipment);
    return result;
  },
});
