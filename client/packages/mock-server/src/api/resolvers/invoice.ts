import { nameResolver } from './name';
import { ListResponse } from './../../data/types';
import { db, ResolvedInvoice, InvoiceListParameters } from './../../data';
import { InvoiceSortFieldInput } from '@openmsupply-client/common/src/types';
import { getDataSorter } from '@openmsupply-client/common/src/utils/arrays/sorters';
import { invoiceLineResolver } from './invoiceLine';
import { createListResponse } from './utils';

const getInvoiceSortKey = (key: string) => {
  switch (key) {
    // case InvoiceSortFieldInput.ConfirmDatetime: {
    //   return 'allocatedDatetime';
    // }
    case InvoiceSortFieldInput.CreatedDatetime: {
      return 'createdDatetime';
    }
    case InvoiceSortFieldInput.Comment: {
      return 'comment';
    }
    // case InvoiceSortFieldInput.TotalAfterTax: {
    //   return 'totalAfterTax';
    // }
    // case InvoiceSortFieldInput.OtherPartyName: {
    //   return 'otherPartyName';
    // }
    case InvoiceSortFieldInput.InvoiceNumber: {
      return 'invoiceNumber';
    }
    case InvoiceSortFieldInput.Status:
    default: {
      return 'status';
    }
  }
};

export const invoiceResolver = {
  byInvoiceNumber: (invoiceNumber: number): ResolvedInvoice => {
    const invoice = db.invoice.get.byInvoiceNumber(invoiceNumber);
    return invoiceResolver.byId(invoice.id);
  },
  list: (
    params: InvoiceListParameters
  ): ListResponse<ResolvedInvoice, 'InvoiceConnector'> => {
    const invoices = db.get.all.invoice();

    const resolved = invoices.map(invoice => {
      return invoiceResolver.byId(invoice.id);
    });

    const { filter, page = {}, sort = [] } = params ?? {};

    const { offset = 0, first = 20 } = page ?? {};
    const { key = 'otherPartyName', desc = false } =
      sort && sort[0] ? sort[0] : {};

    let filtered = resolved;
    if (filter) {
      if (filter.type) {
        filtered = filtered.filter(invoice => {
          return invoice.type === filter.type?.equalTo;
        });
      }
      if (filter.comment) {
        filtered = filtered.filter(invoice => {
          if (filter.comment?.equalTo) {
            return invoice.type === filter.comment?.equalTo;
          } else if (filter.comment?.like) {
            return invoice?.comment
              ?.toLowerCase()
              .includes(filter.comment?.like?.toLowerCase());
          } else {
            return true;
          }
        });
      }
    }

    const paged = filtered.slice(offset ?? 0, (offset ?? 0) + (first ?? 20));

    if (key) {
      paged.sort(getDataSorter(getInvoiceSortKey(key), !!desc));
    }

    return createListResponse<ResolvedInvoice, 'InvoiceConnector'>(
      filtered.length,
      paged,
      'InvoiceConnector'
    );
  },
  byId: (id: string): ResolvedInvoice => {
    const invoice = db.get.byId.invoice(id);
    const otherParty = nameResolver.byId(invoice.otherPartyId);
    const lines = invoiceLineResolver.byInvoiceId(invoice.id);

    return {
      __typename: 'InvoiceNode',
      ...invoice,
      otherParty,
      otherPartyName: otherParty.name,
      lines,
    };
  },
};
