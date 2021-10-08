import { Api } from '../api';

const Types = `
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
        lines: [InvoiceLine]
    }

    type TransactionResponse { 
      data: [Transaction],
      totalLength: Int
    }
  `;

const QueryResolvers = {
  transactions: (_, { first = 50, offset = 0, sort, desc }) =>
    Api.ResolverService.list.invoice({ first, offset, sort, desc }),

  transaction: (_, { id }) => {
    return Api.ResolverService.byId.invoice(id);
  },
};

const MutationResolvers = {
  deleteTransaction: (_, { transactions }) => {
    transactions.forEach(transaction => {
      Api.MutationService.remove.invoice(transaction);
    });

    return transactions;
  },
  updateTransaction: (_, { transaction }) => {
    return Api.MutationService.update.invoice(transaction);
  },
  insertTransaction: (_, { transaction }) => {
    return Api.MutationService.insert.invoice(transaction);
  },
  deleteTransaction: (_, transaction) => {
    return Api.MutationService.remove.invoice(transaction);
  },
};

const Queries = `
    transactions(first: Int, offset: Int, sort: String, desc: Boolean): TransactionResponse
    transaction(id: String!): Transaction
`;

const Mutations = `
    updateTransaction(transaction: TransactionPatch): Transaction
    insertTransaction(transaction: TransactionPatch): Transaction
    deleteTransaction(transaction: TransactionPatch): Transaction
    deleteTransactions(transactions: [TransactionPatch]): [Transaction]
`;

const Inputs = `
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

export const Invoice = {
  Mutations,
  Types,
  QueryResolvers,
  Queries,
  MutationResolvers,
  Inputs,
};
