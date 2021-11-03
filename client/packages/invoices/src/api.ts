import {
  request,
  gql,
  Name,
  SortBy,
  Invoice,
  GraphQLClient,
  getSdk,
  NameSortFieldInput,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
import { OutboundShipment } from './OutboundShipment/DetailView/types';

const client = new GraphQLClient(Environment.API_URL);
const api = getSdk(client);

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

export const updateInvoiceFn = async (updated: Invoice): Promise<Invoice> => {
  const invoicePatch: Partial<Invoice> = { ...updated };
  delete invoicePatch['lines'];

  const patch = { invoicePatch };

  const result = await request(Environment.API_URL, getMutation(), patch);

  const { updateInvoice } = result;
  return updateInvoice;
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
