import {
  UpdateOutboundShipmentInput,
  SortBy,
  ListApi,
  InvoiceSortFieldInput,
  InvoicePriceResponse,
} from '@openmsupply-client/common';
import { OutboundShipmentApi } from '../api';
import {
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

    const invoices = result.invoices;

    const nodes = invoices.nodes.map(invoice => ({
      ...invoice,
      pricing: pricingGuard(invoice.pricing),
    }));

    return { nodes, totalCount: invoices.totalCount };
  };

export const onUpdate =
  (api: OutboundShipmentApi) =>
  async (
    patch: Partial<OutboundShipmentRowFragment> & { id: string }
  ): Promise<string> => {
    const result = await api.updateOutboundShipment({
      input: invoiceToInput(patch),
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
    case 'createdDatetime': {
      return InvoiceSortFieldInput.CreatedDatetime;
    }

    case 'comment': {
      return InvoiceSortFieldInput.Comment;
    }
    case 'invoiceNumber': {
      return InvoiceSortFieldInput.InvoiceNumber;
    }

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
