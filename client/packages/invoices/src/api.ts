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
  query invoice($id: String!) {
    invoice(id: $id) {
      ... on InvoiceNode {
        id
        comment
        confirmedDatetime
        entryDatetime
        finalisedDatetime
        invoiceNumber
        lines {
          ... on InvoiceLineConnector {
            nodes {
              batch
              costPricePerPack
              expiryDate
              id
              itemCode
              itemId
              itemName
              numberOfPacks
              packSize
              sellPricePerPack
            }
            totalCount
          }
        }
        otherPartyId
        otherPartyName
        pricing {
          ... on InvoicePricingNode {
            __typename
            totalAfterTax
          }
        }
        status
        theirReference
        type
      }
      ... on NodeError {
        __typename
        error {
          description
        }
      }
    }
  }
`;

export const getNameListQuery = (): string => gql`
  query names {
    names {
      ... on NameConnector {
        nodes {
          code
          id
          isCustomer
          isSupplier
          name
        }
        totalCount
      }
      ... on ConnectorError {
        __typename
        error {
          description
        }
      }
    }
  }
`;

export const getMutation = (): string => gql`
  mutation updateInvoice($invoicePatch: InvoicePatch) {
    updateInvoice(invoice: $invoicePatch) {
      id
      comment
      status
      type
      entered
      confirmed
      invoiceNumber
      total
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
  nodes: Name[];
  totalCount: number;
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
    // 'http://localhost:8000/graphql',
    Environment.API_URL,
    getListQuery(),
    {
      first,
      offset,
      key: sortBy.key,
      desc: sortBy.isDesc,
    }
  );

  return invoices;
};

export const detailQueryFn = (id: string) => async (): Promise<Invoice> => {
  const result = await request(Environment.API_URL, getDetailQuery(), {
    id,
  });
  const { invoice } = result;

  const mapped = { ...invoice, lines: invoice.lines.nodes };

  return mapped;
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
  id: string
) => Api<Invoice, OutboundShipment> = (id: string) => ({
  onRead: detailQueryFn(id),
  onUpdate: async (outboundShipment: OutboundShipment): Promise<Invoice> => {
    const result = await updateFn(outboundShipment);
    return result;
  },
});
