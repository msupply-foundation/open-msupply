import {
  UpdateInboundShipmentInput,
  SortBy,
  ListApi,
  InvoiceSortFieldInput,
  InvoicePriceResponse,
} from '@openmsupply-client/common';
import { Invoice, InvoiceRow } from '../../types';
import { InboundShipmentApi, InvoicesQueryVariables } from '../api';

const invoiceToInput = (
  patch: Partial<Invoice> & { id: string }
): UpdateInboundShipmentInput => {
  return {
    id: patch.id,
    colour: patch.colour,
  };
};

const getSortKey = (sortBy: SortBy<InvoiceRow>): InvoiceSortFieldInput => {
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

const getSortDesc = (sortBy: SortBy<InvoiceRow>): boolean => {
  return !!sortBy.isDesc;
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

export const getInboundShipmentListViewApi = (
  api: InboundShipmentApi,
  storeId: string
): ListApi<InvoiceRow> => ({
  onRead: ({ first, offset, sortBy, filterBy, storeId }) => {
    const queryParams: InvoicesQueryVariables = {
      first,
      offset,
      key: getSortKey(sortBy),
      desc: getSortDesc(sortBy),
      filter: filterBy,
      storeId,
    };
    return async (): Promise<{ nodes: InvoiceRow[]; totalCount: number }> => {
      const result = await api.invoices(queryParams);

      const invoices = result.invoices;

      const nodes = invoices.nodes.map(invoice => ({
        ...invoice,
        pricing: pricingGuard(invoice.pricing),
      }));

      return { nodes, totalCount: invoices.totalCount };
    };
  },
  onDelete: async (invoices: InvoiceRow[]): Promise<string[]> => {
    const result = await api.deleteInboundShipments({
      storeId,
      deleteInboundShipments: invoices.map(invoice => ({ id: invoice.id })),
    });

    const { batchInboundShipment } = result;

    if (batchInboundShipment.deleteInboundShipments) {
      return batchInboundShipment.deleteInboundShipments.map(({ id }) => id);
    }

    throw new Error('Unknown');
  },
  onUpdate: async (
    patch: Partial<Invoice> & { id: string }
  ): Promise<string> => {
    const result = await api.updateInboundShipment({
      input: invoiceToInput(patch),
    });

    const { updateInboundShipment } = result;

    if (updateInboundShipment.__typename === 'InvoiceNode') {
      return updateInboundShipment.id;
    }

    throw new Error(updateInboundShipment.error.description);
  },
  onCreate: async (invoice: Partial<Invoice>): Promise<string> => {
    const result = await api.insertInboundShipment({
      id: invoice.id ?? '',
      otherPartyId: invoice?.otherPartyId ?? '',
      storeId,
    });

    const { insertInboundShipment } = result;

    if (insertInboundShipment.__typename === 'InvoiceNode') {
      return insertInboundShipment.id;
    }

    throw new Error(insertInboundShipment.error.description);
  },
});
