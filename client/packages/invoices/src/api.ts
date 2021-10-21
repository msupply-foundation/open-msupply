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
      entryDatetime
      confirmedDatetime
      invoiceNumber
      pricing {
        totalAfterTax
      }
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
        stockLine {
          batch
          costPricePerPack
          packSize
          sellPricePerPack
        }
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
  query invoices(
    $first: Int
    $offset: Int
    $key: InvoiceSortFieldInput!
    $desc: Boolean
  ) {
    invoices(
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
    ) {
      ... on ConnectorError {
        __typename
        error {
          description
          ... on DatabaseError {
            __typename
            description
            fullError
          }
        }
      }
      ... on InvoiceConnector {
        nodes {
          id
          invoiceNumber
          finalisedDatetime
          entryDatetime
          confirmedDatetime
          comment
          otherPartyName
          status
          theirReference
          type
          pricing {
            ... on NodeError {
              __typename
              error {
                description
              }
            }
            ... on InvoicePricingNode {
              __typename
              totalAfterTax
            }
          }
        }
        totalCount
      }
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
}): Promise<{ nodes: Invoice[]; totalCount: number }> => {
  const {
    first = 20,
    offset = 0,
    sortBy = { key: 'TYPE', isDesc: false },
  } = queryParams;

  const { invoices } = await request(
    'http://localhost:8000/graphql',
    getListQuery(),
    {
      first,
      offset,
      key: 'TYPE',
      desc: sortBy.isDesc,
    }
  );

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
  const invoicePatch: Partial<Invoice> = { ...updated };
  delete invoicePatch['lines'];

  const patch = { invoicePatch };

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
