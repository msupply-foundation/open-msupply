import faker from 'faker';

const TransactionData = Array.from({ length: 10 }).map((_, i) => ({
  id: `${i}`,
  customer: `${faker.name.firstName()} ${faker.name.lastName()}`,
  supplier: `${faker.name.firstName()} ${faker.name.lastName()}`,
  date: faker.date.past().toString(),
  total: `${faker.commerce.price()}`,
}));

const TransactionType = `
    type Transaction {
        id: String
        date: String
        customer: String
        supplier: String
        total: String
    }
  `;

const TransactionQueryResolvers = {
  transactions: () => TransactionData,
  transaction: (_, { id: filterId }) =>
    TransactionData.filter(({ id }) => id === filterId)[0],
};

const TransactionMutationResolvers = {
  updateTransaction: (_, { transaction: { id: filterId, ...patch } }) => {
    const idx = TransactionData.findIndex(({ id }) => id === filterId);
    Transaction[idx] = { ...TransactionData[idx], ...patch };

    return TransactionData[idx];
  },
  addTransaction: (_, newTransaction) => {
    const id = TransactionData.length;
    TransactionData.push({ id, ...newTransaction });
  },
  deleteTransaction: (_, { id: deleteId }) => {
    const idx = TransactionData.findIndex(({ id }) => deleteId === id);
    TransactionData.splice(idx);
    return TransactionData;
  },
};

const TransactionQueries = `
    transactions: [Transaction]
    transaction(id: String!): Transaction
`;

const TransactionMutations = `
    updateTransaction(transaction: TransactionPatch): Transaction
    addTransaction(transaction: TransactionPatch): Transaction
    deleteTransaction(transaction: TransactionPatch): Transaction
`;

const TransactionInput = `
    input TransactionPatch {
        id: String
        date: String
        customer: String
        supplier: String
        total: String
    }
`;

export {
  TransactionMutations,
  TransactionType,
  TransactionQueryResolvers,
  TransactionQueries,
  TransactionMutationResolvers,
  TransactionInput,
};
