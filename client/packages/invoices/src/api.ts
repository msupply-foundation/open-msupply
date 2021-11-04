import {
  request,
  gql,
  Name,
  SortBy,
  Invoice,
  GraphQLClient,
  getSdk,
  NameSortFieldInput,
  InvoiceQuery,
  InvoiceLineConnector,
  InvoicePriceResponse,
  ConnectorError,
  NameResponse,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
import { OutboundShipment } from './OutboundShipment/DetailView/types';

const client = new GraphQLClient(Environment.API_URL);
const api = getSdk(client);

const otherPartyGuard = (otherParty: NameResponse) => {
  if (otherParty.__typename === 'NameNode') {
    return otherParty;
  } else if (otherParty.__typename === 'NodeError') {
    throw new Error(otherParty.error.description);
  }

  throw new Error('Unknown');
};

const pricingGuard = (pricing: InvoicePriceResponse) => {
  if (pricing.__typename === 'InvoicePricingNode') {
    return pricing;
  } else if (pricing.__typename === 'NodeError') {
    throw new Error(pricing.error.description);
  } else {
    throw new Error('Unknown');
  }
};

const invoiceGuard = (invoiceQuery: InvoiceQuery) => {
  if (invoiceQuery.invoice.__typename === 'InvoiceNode') {
    return invoiceQuery.invoice;
  }

  throw new Error(invoiceQuery.invoice.error.description);
};

const linesGuard = (invoiceLines: InvoiceLineConnector | ConnectorError) => {
  if (invoiceLines.__typename === 'InvoiceLineConnector') {
    return invoiceLines.nodes;
  }

  if (invoiceLines.__typename === 'ConnectorError') {
    throw new Error(invoiceLines.error.description);
  }

  throw new Error('Unknown');
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

export const onRead = async (id: string): Promise<Invoice> => {
  const result = await api.invoice({ id });

  const invoice = invoiceGuard(result);

  return {
    ...invoice,
    lines: linesGuard(invoice.lines),
    pricing: pricingGuard(invoice.pricing),
    otherParty: otherPartyGuard(invoice.otherParty),
  };
};

export const onUpdate = async (updated: Invoice): Promise<Invoice> => {
  const invoicePatch: Partial<Invoice> = { ...updated };
  delete invoicePatch['lines'];
  const patch = { invoicePatch };
  const result = await request(Environment.API_URL, getMutation(), patch);
  const { updateInvoice } = result;
  return updateInvoice;
};

interface Api<ReadType, UpdateType> {
  onRead: (id: string) => Promise<ReadType>;
  onUpdate: (val: UpdateType) => Promise<ReadType>;
}

export const OutboundShipmentDetailViewApi: Api<Invoice, OutboundShipment> = {
  onRead,
  onUpdate,
};
