import { ObjectWithStringKeys } from './../../common/src/types/utility';
import { Transaction, SortBy, ListApi } from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
import { request, gql } from 'graphql-request';

export const getDetailQuery = (): string => gql`
  query transaction($id: String!) {
    transaction(id: $id) {
      id
      color
      comment
      status
      type
      entered
      confirmed
      invoiceNumber
      total
      color
      name
      items {
        id
        code
        name
        packSize
        quantity
      }
    }
  }
`;

export const getMutation = (): string => gql`
  mutation upsertTransaction($transactionPatch: TransactionPatch) {
    upsertTransaction(transaction: $transactionPatch) {
      id
      color
      comment
      status
      type
      entered
      confirmed
      invoiceNumber
      total
      color
      name
    }
  }
`;

export const getDeleteMutation = (): string => gql`
  mutation deleteTransactions($transactions: [TransactionPatch]) {
    deleteTransactions(transactions: $transactions) {
      id
    }
  }
`;

export const getListQuery = (): string => gql`
  query transactions($first: Int, $offset: Int, $sort: String, $desc: Boolean) {
    transactions(first: $first, offset: $offset, sort: $sort, desc: $desc) {
      data {
        id
        color
        comment
        status
        type
        entered
        confirmed
        invoiceNumber
        total
        color
        name
      }
      totalLength
    }
  }
`;

export const deleteFn = async (transactions: Transaction[]) => {
  await request(Environment.API_URL, getDeleteMutation(), {
    transactions,
  });
};

export const listQueryFn = async <T extends ObjectWithStringKeys>(queryParams: {
  first: number;
  offset: number;
  sortBy: SortBy<T>;
}): Promise<{ data: Transaction[]; totalLength: number }> => {
  const { first, offset, sortBy } = queryParams;

  const { transactions } = await request(Environment.API_URL, getListQuery(), {
    first,
    offset,
    sort: sortBy.key,
    desc: sortBy.isDesc,
  });

  return transactions;
};

export const detailQueryFn = (id: string) => async (): Promise<Transaction> => {
  const result = await request(Environment.API_URL, getDetailQuery(), {
    id,
  });
  const { transaction } = result;
  return transaction;
};

export const updateFn = async (updated: Transaction): Promise<Transaction> => {
  const patch = { transactionPatch: updated };
  const result = await request(Environment.API_URL, getMutation(), patch);
  const { upsertTransaction } = result;
  return upsertTransaction;
};

export const OutboundShipmentListViewApi: ListApi<Transaction> = {
  onQuery:
    ({ first, offset, sortBy }) =>
    () =>
      listQueryFn({ first, offset, sortBy }),
  onDelete: deleteFn,
  onUpdate: updateFn,
};
