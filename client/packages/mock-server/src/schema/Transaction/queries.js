import { TransactionData } from './data';

export const parseValue = (object, key) => {
  const value = object[key];
  if (typeof value === 'string') {
    const valueAsNumber = Number.parseFloat(value);
    if (!Number.isNaN(valueAsNumber)) return valueAsNumber;
    return value.toUpperCase(); // ignore case
  }
  return value;
};

export const getDataSorter = (sortKey, desc) => (a, b) => {
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

export const delay = async ms =>
  new Promise(resolve =>
    setTimeout(() => {
      resolve('');
    }, ms)
  );

export const getTransactionData = async (first, offset, sort, desc) => {
  // await delay(1000 * Math.random() + 200);
  const data = TransactionData.slice();
  if (sort) {
    const sortData = getDataSorter(sort, desc);
    data.sort(sortData);
  }
  return { totalLength: data.length, data: data.slice(offset, offset + first) };
};

export const TransactionQueryResolvers = {
  transactions: (_, { first = 50, offset = 0, sort, desc }) =>
    getTransactionData(first, offset, sort, desc),
  transaction: (_, { id: filterId }) =>
    TransactionData.filter(({ id }) => id === filterId)[0],
};

export const TransactionQueries = `
    transactions(first: Int, offset: Int, sort: String, desc: Boolean): TransactionResponse
    transaction(id: String!): Transaction
`;
