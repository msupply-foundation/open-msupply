import { graphql } from 'msw';

import faker from 'faker';

const TransactionData = Array.from({ length: 500 }).map((_, i) => ({
  id: `${i}`,
  customer: `${faker.name.firstName()} ${faker.name.lastName()}`,
  supplier: `${faker.name.firstName()} ${faker.name.lastName()}`,
  date: faker.date.past().toString(),
  total: `${faker.commerce.price()}`,
  color: 'grey',
}));

const parseValue = (object: any, key: string) => {
  const value = object[key];
  if (typeof value === 'string') {
    const valueAsNumber = Number.parseFloat(value);
    if (!Number.isNaN(valueAsNumber)) return valueAsNumber;
    return value.toUpperCase(); // ignore case
  }
  return value;
};

const getDataSorter = (sortKey: string, desc: boolean) => (a: any, b: any) => {
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

const upsertTransaction = graphql.mutation(
  'upsertTransaction',
  (request, response, context) => {
    const { variables } = request;
    const { transactionPatch } = variables;

    const { id, ...patch } = transactionPatch;

    if (!id) {
      const newTransaction = { id: String(TransactionData.length), ...patch };
      TransactionData.push(newTransaction);
      return response(context.data({ upsertTransaction: newTransaction }));
    }

    const idx = TransactionData.findIndex(
      ({ id: filterId }) => id === filterId
    );
    TransactionData[idx] = { ...TransactionData[idx], ...patch };

    return response(context.data({ upsertTransaction: TransactionData[idx] }));
  }
);

const deleteTransactions = graphql.mutation(
  'deleteTransactions',
  (request, response, context) => {
    const { variables } = request;
    const { transactions } = variables;

    transactions.forEach(({ id: deleteId }: { id: string }) => {
      const idx = TransactionData.findIndex(({ id }) => deleteId === id);
      TransactionData.splice(idx, 1);
    });

    return response(context.data({ transactions }));
  }
);

export const transactionList = graphql.query(
  'transactions',
  (request, response, context) => {
    const { variables } = request;
    const { offset = 0, first = 25, sort, desc } = variables;

    const data = TransactionData.slice(offset, first);

    if (sort) {
      const sortData = getDataSorter(sort, desc);
      data.sort(sortData);
    }

    return response(
      context.data({
        transactions: { data, totalLength: 0 },
      })
    );
  }
);

export const transactionDetail = graphql.query(
  'transaction',
  (request, response, context) => {
    const { variables } = request;
    const { id } = variables;
    const transaction = TransactionData[Number(id)];
    return response(context.data({ transaction }));
  }
);

export const handlers = [
  transactionList,
  transactionDetail,
  upsertTransaction,
  deleteTransactions,
];
