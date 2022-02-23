import {
  UpdateOutboundShipmentInput,
  SortBy,
  ListApi,
  InvoiceSortFieldInput,
  InvoicePriceResponse,
} from '@openmsupply-client/common';
import { OutboundShipmentApi } from '../api';
import {
  InvoicesQuery,
  InvoicesQueryVariables,
  OutboundShipmentRowFragment,
} from '../api/operations.generated';

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

export const onCreate =
  (api: OutboundShipmentApi, storeId: string) =>
  async (invoice: Partial<OutboundShipmentRowFragment>): Promise<string> => {
    const result = await api.insertOutboundShipment({
      id: invoice.id ?? '',
      otherPartyId: invoice?.otherPartyId ?? '',
      storeId,
    });

    const { insertOutboundShipment } = result;

    if (insertOutboundShipment.__typename === 'InvoiceNode') {
      return insertOutboundShipment.id;
    }

    throw new Error(insertOutboundShipment.error.description);
  };

export const onDelete =
  (api: OutboundShipmentApi, storeId: string) =>
  async (invoices: OutboundShipmentRowFragment[]): Promise<string[]> => {
    const result = await api.deleteOutboundShipments({
      storeId,
      deleteOutboundShipments: invoices.map(invoice => invoice.id),
    });

    const { batchOutboundShipment } = result;
    if (batchOutboundShipment.deleteOutboundShipments) {
      return batchOutboundShipment.deleteOutboundShipments.map(({ id }) => id);
    }

    throw new Error('Unknown');
  };

export const onRead =
  (api: OutboundShipmentApi) =>
  async (
    queryParams: InvoicesQueryVariables
  ): Promise<{ nodes: OutboundShipmentRowFragment[]; totalCount: number }> => {
    const result = await api.invoices(queryParams);

    const invoices = invoicesGuard(result);

    const nodes = invoices.nodes.map(invoice => ({
      ...invoice,
      pricing: pricingGuard(invoice.pricing),
    }));

    return { nodes, totalCount: invoices.totalCount };
  };

export const onUpdate =
  (
    api: OutboundShipmentApi // storeId: string
  ) =>
  async (
    patch: Partial<OutboundShipmentRowFragment> & { id: string }
  ): Promise<string> => {
    const result = await api.updateOutboundShipment({
      input: invoiceToInput(patch),
      // storeId,
    });

    const { updateOutboundShipment } = result;

    if (updateOutboundShipment.__typename === 'InvoiceNode') {
      return updateOutboundShipment.id;
    }

    throw new Error(updateOutboundShipment.error.description);
  };

const invoiceToInput = (
  patch: Partial<OutboundShipmentRowFragment> & { id: string }
): UpdateOutboundShipmentInput => {
  return {
    id: patch.id,
    colour: patch.colour,
  };
};

const getSortKey = (
  sortBy: SortBy<OutboundShipmentRowFragment>
): InvoiceSortFieldInput => {
  switch (sortBy.key) {
    // case 'allocatedDatetime': {
    //   return InvoiceSortFieldInput.ConfirmDatetime;
    // }
    case 'createdDatetime': {
      return InvoiceSortFieldInput.CreatedDatetime;
    }

    case 'comment': {
      return InvoiceSortFieldInput.Comment;
    }
    case 'invoiceNumber': {
      return InvoiceSortFieldInput.InvoiceNumber;
    }
    // case 'otherPartyName': {
    //   return InvoiceSortFieldInput.OtherPartyName;
    // }
    // case 'totalAfterTax': {
    //   return InvoiceSortFieldInput.TotalAfterTax;
    // }
    case 'status':
    default: {
      return InvoiceSortFieldInput.Status;
    }
  }
};

const getSortDesc = (sortBy: SortBy<OutboundShipmentRowFragment>): boolean => {
  return !!sortBy.isDesc;
};

export const getOutboundShipmentListViewApi = (
  omSupplyApi: OutboundShipmentApi,
  storeId: string
): ListApi<OutboundShipmentRowFragment> => ({
  onRead: ({ first, offset, sortBy, filterBy, storeId }) => {
    const queryParams: InvoicesQueryVariables = {
      first,
      offset,
      key: getSortKey(sortBy),
      desc: getSortDesc(sortBy),
      filter: filterBy,
      storeId: storeId,
    };

    const onReadFn = onRead(omSupplyApi);
    return () => onReadFn(queryParams);
  },
  onDelete: onDelete(omSupplyApi, storeId),
  onUpdate: onUpdate(
    omSupplyApi // storeId
  ),
  onCreate: onCreate(omSupplyApi, storeId),
});
