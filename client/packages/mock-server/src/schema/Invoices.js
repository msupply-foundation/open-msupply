import faker from 'faker';

const InvoicesData = Array.from({ length: 10 }).map((_, i) => ({
  id: `${i}`,
  customer: `${faker.name.firstName()} ${faker.name.lastName()}`,
  supplier: `${faker.name.firstName()} ${faker.name.lastName()}`,
  date: faker.date.past().toString(),
  total: `${faker.commerce.price()}`,
}));

const InvoiceType = `
    type Invoice {
        id: String
        date: String
        customer: String
        supplier: String
        total: String
    }
  `;

const InvoiceQueryResolvers = {
  invoices: () => InvoicesData,
  invoice: (_, { id: filterId }) =>
    InvoicesData.filter(({ id }) => id === filterId)[0],
};

const InvoicesMutationResolvers = {
  updateInvoice: (_, { invoice: { id: filterId, ...patch } }) => {
    const idx = InvoicesData.findIndex(({ id }) => id === filterId);
    InvoicesData[idx] = { ...InvoicesData[idx], ...patch };

    return InvoicesData[idx];
  },
  addInvoice: (_, newInvoice) => {
    const id = InvoicesData.length;
    InvoicesData.push({ id, ...newInvoice });
  },
  deleteInvoice: (_, { id: deleteId }) => {
    const idx = InvoicesData.findIndex(({ id }) => deleteId === id);
    InvoicesData.splice(idx);
    return InvoicesData;
  },
};

const InvoiceQueries = `
    invoices: [Invoice]
    invoice(id: String!): Invoice
`;

const InvoiceMutations = `
    updateInvoice(invoice: InvoicePatch): Invoice
    addInvoice(invoice: InvoicePatch): Invoice
    deleteInvoice(invoice: InvoicePatch): Invoice
`;

const InvoiceInput = `
    input InvoicePatch {
        id: String
        date: String
        customer: String
        supplier: String
        total: String
    }
`;

export {
  InvoiceMutations,
  InvoicesData,
  InvoiceType,
  InvoiceQueryResolvers,
  InvoiceQueries,
  InvoicesMutationResolvers,
  InvoiceInput,
};
