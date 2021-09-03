import { TransactionData } from './data';

export const TransactionMutationResolvers = {
  upsertTransaction: (_, { transaction: { id: filterId, ...patch } }) => {
    if (!filterId) {
      const numberOfTransactions = TransactionData.length;
      const newId = String(TransactionData.length);
      const newTransaction = { id: newId, ...patch };
      TransactionData[numberOfTransactions] = newTransaction;
      return newTransaction;
    }

    const idx = TransactionData.findIndex(({ id }) => id === filterId);

    if (idx === -1) {
      TransactionData.push({ id: filterId, ...patch });
    } else {
      TransactionData[idx] = { ...TransactionData[idx], ...patch };
    }

    return TransactionData[idx];
  },
  deleteTransaction: (_, { id: deleteId }) => {
    const idx = TransactionData.findIndex(({ id }) => deleteId === id);
    TransactionData.splice(idx);
    return TransactionData;
  },
};

export const TransactionMutations = `
    upsertTransaction(transaction: TransactionPatch): Transaction
    addTransaction(transaction: TransactionPatch): Transaction
    deleteTransaction(transaction: TransactionPatch): Transaction
`;

export const TransactionInput = `
    input TransactionPatch {
        id: String
        date: String
        customer: String
        supplier: String
        total: String
    }
`;
