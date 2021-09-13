import faker from 'faker';

const TransactionData = Array.from({ length: 500 }).map((_, i) => ({
  id: `${i}`,
  customer: `${faker.name.firstName()} ${faker.name.lastName()}`,
  supplier: `${faker.name.firstName()} ${faker.name.lastName()}`,
  date: faker.date.past().toString(),
  total: `${faker.commerce.price()}`,
  color: 'grey',
}));

const TransactionTypes = `
    type Transaction {
        id: String
        date: String
        customer: String
        supplier: String
        total: String
        color: String
    }
    type TransactionResponse { 
      data: [Transaction],
      totalLength: Int
    }
  `;

const parseValue = (object, key) => {
  const value = object[key];
  if (typeof value === 'string') {
    const valueAsNumber = Number.parseFloat(value);
    if (!Number.isNaN(valueAsNumber)) return valueAsNumber;
    return value.toUpperCase(); // ignore case
  }
  return value;
};

const getDataSorter = (sortKey, desc) => (a, b) => {
  const valueA = parseValue(a, sortKey);
  const valueB = parseValue(b, sortKey);

  if (valueA < valueB) {
    return desc ? 1 : -1;
  }
  if (valueA > valueB) {
    return desc ? -1 : 1;
  }

  return 0;
};

// const delay = async ms =>
//   new Promise(resolve =>
//     setTimeout(() => {
//       resolve('');
//     }, ms)
//   );

const getTransactionData = async (first, offset, sort, desc) => {
  // await delay(1000 * Math.random() + 200);
  const data = TransactionData.slice();
  if (sort) {
    const sortData = getDataSorter(sort, desc);
    data.sort(sortData);
  }
  return { totalLength: data.length, data: data.slice(offset, offset + first) };
};

const TransactionQueryResolvers = {
  transactions: (_, { first = 50, offset = 0, sort, desc }) =>
    getTransactionData(first, offset, sort, desc),
  transaction: (_, { id: filterId }) =>
    TransactionData.filter(({ id }) => id === filterId)[0],
};

const TransactionMutationResolvers = {
  deleteTransactions: (_, { transactions }) => {
    transactions.forEach(({ id: deleteId }) => {
      const idx = TransactionData.findIndex(({ id }) => deleteId === id);
      TransactionData.splice(idx, 1);
    });

    return transactions;
  },

  upsertTransaction: (_, { transaction: { id: filterId, ...patch } }) => {
    if (!filterId) {
      const newId = String(TransactionData.length);
      const newTransaction = { id: newId, ...patch };

      TransactionData.push(newTransaction);
      return newTransaction;
    }

    const idx = TransactionData.findIndex(({ id }) => id === filterId);
    TransactionData[idx] = { ...TransactionData[idx], ...patch };

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
    transactions(first: Int, offset: Int, sort: String, desc: Boolean): TransactionResponse
    transaction(id: String!): Transaction
`;

const TransactionMutations = `
    upsertTransaction(transaction: TransactionPatch): Transaction
    addTransaction(transaction: TransactionPatch): Transaction
    deleteTransaction(transaction: TransactionPatch): Transaction
    deleteTransactions(transactions: [TransactionPatch]): [Transaction]
`;

const TransactionInput = `
    input TransactionPatch {
        id: String
        date: String
        customer: String
        supplier: String
        total: String
        color: String
    }
`;

export {
  TransactionMutations,
  TransactionTypes,
  TransactionQueryResolvers,
  TransactionQueries,
  TransactionMutationResolvers,
  TransactionInput,
};
