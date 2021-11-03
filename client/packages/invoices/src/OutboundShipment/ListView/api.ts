import {
  ObjectWithStringKeys,
  InvoicesQuery,
  request,
  gql,
  batchRequests,
  SortBy,
  ListApi,
  Invoice,
  GraphQLClient,
  getSdk,
  InvoiceSortFieldInput,
  InvoiceRow,
  InvoicePriceResponse,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';

const client = new GraphQLClient(Environment.API_URL);
const api = getSdk(client);

const pricingGuard = (pricing: InvoicePriceResponse) => {
  if (pricing.__typename === 'InvoicePricingNode') {
    return pricing;
  } else if (pricing.__typename === 'NodeError') {
    throw new Error(pricing.error.description);
  } else {
    throw new Error('Unknown');
  }
};

const invoicesGuard = (invoicesQuery: InvoicesQuery) => {
  if (invoicesQuery.invoices.__typename === 'InvoiceConnector') {
    return invoicesQuery.invoices;
  }

  throw new Error(invoicesQuery.invoices.error.description);
};

export const onUpdate = async (updated: InvoiceRow): Promise<InvoiceRow> => {
  const invoicePatch: Partial<Invoice> = { ...updated };
  delete invoicePatch['lines'];

  const patch = { invoicePatch };

  const result = await request(Environment.API_URL, getMutation(), patch);

  const { updateInvoice } = result;
  return updateInvoice;
};

export const getInsertInvoiceQuery = (): string => gql`
  mutation insertInvoice($id: String!, $otherPartyId: String!) {
    insertOutboundShipment(input: { id: $id, otherPartyId: $otherPartyId }) {
      __typename
      ... on InvoiceNode {
        id
        comment
        confirmedDatetime
        entryDatetime
        finalisedDatetime
        invoiceNumber
      }
      ... on NodeError {
        __typename
        error {
          description
        }
      }
      ... on InsertCustomerInvoiceError {
        __typename
        error {
          description
        }
      }
    }
  }
`;

export const onCreate = async (invoice: Partial<Invoice>): Promise<Invoice> => {
  const result = await request(Environment.API_URL, getInsertInvoiceQuery(), {
    id: invoice.id,
    otherPartyId: invoice['nameId'],
  });
  const { insertCustomerInvoice } = result;

  return insertCustomerInvoice;
};

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

export const onDelete = async (invoices: InvoiceRow[]) => {
  await batchRequests(
    Environment.API_URL,
    invoices.map(invoice => ({
      document: getDeleteMutation(),
      variables: { invoiceId: invoice.id },
    }))
  );
};

export const onRead = async <T extends ObjectWithStringKeys>(queryParams: {
  first: number;
  offset: number;
  sortBy: SortBy<T>;
}): Promise<{ nodes: InvoiceRow[]; totalCount: number }> => {
  const {
    first = 20,
    offset = 0,
    sortBy = { key: 'TYPE', isDesc: false },
  } = queryParams;

  const result = await api.invoices({
    first,
    offset,
    key: InvoiceSortFieldInput.Type,
    desc: sortBy.isDesc,
  });

  const invoices = invoicesGuard(result);

  const nodes = invoices.nodes.map(invoice => ({
    ...invoice,
    pricing: pricingGuard(invoice.pricing),
  }));

  return { nodes, totalCount: invoices.totalCount };
};

export const OutboundShipmentListViewApi: ListApi<InvoiceRow> = {
  onQuery:
    ({ first, offset, sortBy }) =>
    () =>
      onRead({ first, offset, sortBy }),
  onDelete,
  onUpdate,
  onCreate,
};
