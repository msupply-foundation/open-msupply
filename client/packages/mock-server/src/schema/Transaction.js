import faker from 'faker';

const choose = options => {
  const numberOfOptions = options.length;

  const randomIdx = Math.floor(Math.random() * numberOfOptions);

  return options[randomIdx];
};

const TransactionData = Array.from({ length: 500 }).map((_, i) => ({
  id: `${i}`,
  name: `${faker.name.firstName()} ${faker.name.lastName()}`,
  status: choose(['Confirmed', 'Finalised']),
  entered: faker.date.past().toString(),
  confirmed: faker.date.past().toString(),
  invoiceNumber: `${i}`,
  total: `$${faker.commerce.price()}`,
  color: 'grey',
  type: choose([
    'Customer invoice',
    'Supplier invoice',
    'Customer credit',
    'Supplier credit',
  ]),
  comment: faker.commerce.productDescription(),
}));

const TransactionTypes = `
    type Item {
        id: String
        code: String
        name: String
        packSize: Int
        quantity: Int
    }
    type Transaction {
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
        items: [Item]
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
  const transactions = TransactionData.slice();
  if (sort) {
    const sortData = getDataSorter(sort, desc);
    transactions.sort(sortData);
  }
  const data = transactions.slice(offset, offset + first).map(addItems);

  return { totalLength: data.length, data };
};

const addItems = transaction => ({ ...transaction, items: getItems() });
const getItems = () =>
  Array.from({ length: Math.random() * 10 }).map(() => ({
    id: `${faker.datatype.uuid()}`,
    code: `${faker.random.alpha({ count: 6 })}`,
    name: `${faker.commerce.productName()}`,
    packSize: 1,
    quantity: faker.datatype.number(100),
  }));

const TransactionQueryResolvers = {
  transactions: (_, { first = 50, offset = 0, sort, desc }) =>
    getTransactionData(first, offset, sort, desc),
  transaction: (_, { id: filterId }) =>
    addItems(TransactionData.filter(({ id }) => id === filterId)[0]),
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

export {
  TransactionMutations,
  TransactionTypes,
  TransactionQueryResolvers,
  TransactionQueries,
  TransactionMutationResolvers,
  TransactionInput,
};
