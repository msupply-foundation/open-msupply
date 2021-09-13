import { Environment } from './../../config/src/index';
import { QueryProps } from './../../common/src/ui/layout/tables/types';
import { Transaction } from './../../common/src/types/index';
import { request, gql } from 'graphql-request';

export const getDetailQuery = (): string => gql`
  query transaction($id: String!) {
    transaction(id: $id) {
      id
      date
      customer
      supplier
      total
      color
    }
  }
`;

export const getMutation = (): string => gql`
  mutation upsertTransaction($transactionPatch: TransactionPatch) {
    upsertTransaction(transaction: $transactionPatch) {
      id
      date
      customer
      supplier
      total
      color
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
        customer
        supplier
        date
        total
        color
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

export const listQueryFn = async (
  queryParams: QueryProps<Transaction>
): Promise<{ data: Transaction[]; totalLength: number }> => {
  const { first, offset, sortBy } = queryParams;

  const { transactions } = await request(Environment.API_URL, getListQuery(), {
    first,
    offset,
    sort: sortBy?.[0]?.id,
    desc: !!sortBy?.[0]?.desc,
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
