import { ObjectWithStringKeys } from '@openmsupply-client/common/src/types/utility';
import {
  request,
  gql,
  batchRequests,
  Name,
  SortBy,
  ListApi,
  Invoice,
  GraphQLClient,
  getSdk,
  InvoiceSortFieldInput,
  InvoiceRow,
  NameSortFieldInput,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
import { OutboundShipment } from './OutboundShipment/DetailView/types';

const client = new GraphQLClient(Environment.API_URL);
const api = getSdk(client);

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

export const createFn = async (invoice: Partial<Invoice>): Promise<Invoice> => {
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

export const deleteFn = async (invoices: InvoiceRow[]) => {
  await batchRequests(
    Environment.API_URL,
    invoices.map(invoice => ({
      document: getDeleteMutation(),
      variables: { invoiceId: invoice.id },
    }))
  );
};

export const nameListQueryFn = async ({
  first,
  offset,
  sortBy,
}: {
  first?: number;
  offset?: number;
  sortBy?: SortBy<Name>;
} = {}): Promise<{
  nodes: Name[];
  totalCount: number;
}> => {
  const key =
    sortBy?.key === 'name' ? NameSortFieldInput.Name : NameSortFieldInput.Code;

  const { names } = await api.names({
    first,
    offset,
    key,
    desc: sortBy?.isDesc,
  });

  if (names.__typename === 'NameConnector') {
    return names;
  }

  throw new Error(names.error.description);
};

export const listQueryFn = async <T extends ObjectWithStringKeys>(queryParams: {
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

  if (result.invoices.__typename === 'InvoiceConnector') {
    return {
      totalCount: result.invoices.totalCount,
      nodes: result.invoices.nodes.map(invoice => {
        return {
          ...invoice,
          pricing: {
            totalAfterTax:
              invoice.pricing.__typename === 'InvoicePricingNode'
                ? invoice.pricing.totalAfterTax
                : 0,
          },
        };
      }),
    };
  }

  console.log('-------------------------------------------');
  console.log('result', result);
  console.log('-------------------------------------------');

  throw new Error(result.invoices.error.description);
};

export const detailQueryFn = (id: string) => async (): Promise<Invoice> => {
  const result = await api.invoice({ id });

  const { invoice } = result;

  if (invoice.__typename === 'InvoiceNode') {
    return {
      ...invoice,
      lines:
        invoice.lines.__typename === 'InvoiceLineConnector'
          ? invoice.lines.nodes
          : [],
      pricing: {
        totalAfterTax:
          invoice.pricing.__typename === 'InvoicePricingNode'
            ? invoice.pricing.totalAfterTax
            : 0,
      },
    };
  } else {
    throw new Error('uhoh');
  }
};

export const updateInvoiceRowFn = async (
  updated: InvoiceRow
): Promise<InvoiceRow> => {
  const invoicePatch: Partial<Invoice> = { ...updated };
  delete invoicePatch['lines'];

  const patch = { invoicePatch };

  const result = await request(Environment.API_URL, getMutation(), patch);

  const { updateInvoice } = result;
  return updateInvoice;
};

export const updateInvoiceFn = async (updated: Invoice): Promise<Invoice> => {
  const invoicePatch: Partial<Invoice> = { ...updated };
  delete invoicePatch['lines'];

  const patch = { invoicePatch };

  const result = await request(Environment.API_URL, getMutation(), patch);

  const { updateInvoice } = result;
  return updateInvoice;
};

export const OutboundShipmentListViewApi: ListApi<InvoiceRow> = {
  onQuery:
    ({ first, offset, sortBy }) =>
    () =>
      listQueryFn({ first, offset, sortBy }),
  onDelete: deleteFn,
  onUpdate: updateInvoiceRowFn,
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
    const result = await updateInvoiceFn(outboundShipment);
    return result;
  },
});
