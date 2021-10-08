import { Api } from '../api';

const Types = `
    type Invoice {
        id: String
        color: String
        comment: String
        status: String
        type: String
        entered: String
        confirmed: String
        invoiceNumber: String
        total: String
        name: String
        lines: [InvoiceLine]
    }

    type InvoiceResponse { 
      data: [Invoice],
      totalLength: Int
    }
  `;

const QueryResolvers = {
  invoices: (_, { first = 50, offset = 0, sort, desc }) =>
    Api.ResolverService.list.invoice({ first, offset, sort, desc }),

  invoice: (_, { id }) => {
    return Api.ResolverService.byId.invoice(id);
  },
};

const MutationResolvers = {
  deleteInvoice: (_, { invoices }) => {
    invoices.forEach(invoice => {
      Api.MutationService.remove.invoice(invoice);
    });

    return invoices;
  },
  updateInvoice: (_, { invoice }) => {
    return Api.MutationService.update.invoice(invoice);
  },
  insertInvoice: (_, { invoice }) => {
    return Api.MutationService.insert.invoice(invoice);
  },
  deleteInvoice: (_, invoice) => {
    return Api.MutationService.remove.invoice(invoice);
  },
};

const Queries = `
    invoices(first: Int, offset: Int, sort: String, desc: Boolean): InvoiceResponse
    invoice(id: String!): Invoice
`;

const Mutations = `
    updateInvoice(invoice: InvoicePatch): Invoice
    insertInvoice(invoice: InvoicePatch): Invoice
    deleteInvoice(invoice: InvoicePatch): Invoice
    deleteInvoices(invoice: [InvoicePatch]): [Invoice]
`;

const Inputs = `
    input InvoicePatch {
        id: String
        color: String
        comment: String
        status: String
        type: String
        entered: String
        confirmed: String
        invoiceNumber: String
        total: String
        name: String
    }
`;

export const Invoice = {
  Mutations,
  Types,
  QueryResolvers,
  Queries,
  MutationResolvers,
  Inputs,
};
