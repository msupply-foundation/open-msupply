import { locationResolver } from './location';
import { itemResolver } from './item';
import { createListResponse } from './utils';
import { ResolvedInvoiceLine, ListResponse } from './../../data/types';
import { db } from './../../data/database';
import { stockLineResolver } from './stockLine';

export const invoiceLineResolver = {
  byId: (id: string): ResolvedInvoiceLine => {
    const invoiceLine = db.get.byId.invoiceLine(id);
    const item = itemResolver.byId(invoiceLine.itemId);
    const location = invoiceLine.locationId
      ? locationResolver.byId(invoiceLine.locationId)
      : null;

    return {
      __typename: 'InvoiceLineNode',
      ...invoiceLine,
      item,
      location,
      stockLine: invoiceLine.stockLineId
        ? stockLineResolver.byId(invoiceLine.stockLineId)
        : undefined,
    };
  },
  byInvoiceId: (
    invoiceId: string
  ): ListResponse<ResolvedInvoiceLine, 'InvoiceLineConnector'> => {
    const invoiceLines = db.get.invoiceLines.byInvoiceId(invoiceId);
    const resolvedLines = invoiceLines.map(invoiceLine =>
      invoiceLineResolver.byId(invoiceLine.id)
    );

    const response = createListResponse<
      ResolvedInvoiceLine,
      'InvoiceLineConnector'
    >(resolvedLines.length, resolvedLines, 'InvoiceLineConnector');

    return response;
  },
};
