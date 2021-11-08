import { OutboundShipment } from './../DetailView/types';
import {
  InvoiceNodeStatus,
  UpdateOutboundShipmentInput,
  InvoicesQuery,
  gql,
  batchRequests,
  SortBy,
  ListApi,
  Invoice,
  InvoiceSortFieldInput,
  InvoicesQueryVariables,
  InvoiceRow,
  InvoicePriceResponse,
  OmSupplyApi,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';

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

export const onCreate =
  (api: OmSupplyApi) =>
  async (invoice: Partial<Invoice>): Promise<string> => {
    const result = await api.insertOutboundShipment({
      id: invoice.id ?? '',
      otherPartyId: String(invoice['nameId']) ?? '',
    });

    const { insertOutboundShipment } = result;

    if (insertOutboundShipment.__typename === 'InvoiceNode') {
      return insertOutboundShipment.id;
    }

    throw new Error(insertOutboundShipment.error.description);
  };

export const onDelete = async (invoices: InvoiceRow[]) => {
  await batchRequests(
    Environment.API_URL,
    invoices.map(invoice => ({
      document: getDeleteMutation(),
      variables: { invoiceId: invoice.id },
    }))
  );
};

export const onRead =
  (api: OmSupplyApi) =>
  async (
    queryParams: InvoicesQueryVariables
  ): Promise<{ nodes: InvoiceRow[]; totalCount: number }> => {
    const result = await api.invoices(queryParams);

    const invoices = invoicesGuard(result);

    const nodes = invoices.nodes.map(invoice => ({
      ...invoice,
      pricing: pricingGuard(invoice.pricing),
    }));

    return { nodes, totalCount: invoices.totalCount };
  };

const invoiceToInput = (
  patch: Partial<Invoice> & { id: string }
): UpdateOutboundShipmentInput => {
  return {
    id: patch.id,
    color: patch.color,
    comment: patch.comment,
    status: patch.status as InvoiceNodeStatus,
    onHold: patch.onHold,
    otherPartyId: patch.otherParty?.id,
    theirReference: patch.theirReference,
  };
};

export const onUpdate =
  (api: OmSupplyApi) =>
  async (patch: Partial<Invoice> & { id: string }): Promise<string> => {
    const result = await api.updateOutboundShipment({
      input: invoiceToInput(patch),
    });

    const { updateOutboundShipment } = result;

    if (updateOutboundShipment.__typename === 'InvoiceNode') {
      return updateOutboundShipment.id;
    }

    throw new Error(updateOutboundShipment.error.description);
  };

const getSortKey = (
  sortBy: SortBy<OutboundShipment>
): InvoiceSortFieldInput => {
  switch (sortBy.key) {
    case 'confirmedDatetime': {
      return InvoiceSortFieldInput.ConfirmDatetime;
    }
    case 'entryDatetime': {
      return InvoiceSortFieldInput.EntryDatetime;
    }
    case 'finalisedDateTime': {
      return InvoiceSortFieldInput.FinalisedDateTime;
    }
    case 'comment': {
      return InvoiceSortFieldInput.Comment;
    }
    case 'invoiceNumber': {
      return InvoiceSortFieldInput.InvoiceNumber;
    }
    case 'otherPartyName': {
      return InvoiceSortFieldInput.OtherPartyName;
    }
    case 'totalAfterTax': {
      return InvoiceSortFieldInput.TotalAfterTax;
    }
    case 'status':
    default: {
      return InvoiceSortFieldInput.Status;
    }
  }
};

const getSortDesc = (sortBy: SortBy<OutboundShipment>): boolean => {
  return !!sortBy.isDesc;
};

export const getOutboundShipmentListViewApi = (
  omSupplyApi: OmSupplyApi
): ListApi<InvoiceRow> => ({
  onRead: ({ first, offset, sortBy, filterBy }) => {
    const queryParams: InvoicesQueryVariables = {
      first,
      offset,
      key: getSortKey(sortBy),
      desc: getSortDesc(sortBy),
      filter: filterBy,
    };

    const onReadFn = onRead(omSupplyApi);
    return () => onReadFn(queryParams);
  },
  onDelete,
  onUpdate: onUpdate(omSupplyApi),
  onCreate: onCreate(omSupplyApi),
});
