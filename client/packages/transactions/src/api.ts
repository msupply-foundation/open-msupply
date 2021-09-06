import { gql } from 'graphql-request';

export const getDetailQuery = (): string => gql`
  query transaction($id: String!) {
    transaction(id: $id) {
      id
      date
      customer
      supplier
      total
    }
  }
`;

export const getMutation = (): string => gql`
  mutation Mutation($transactionPatch: TransactionPatch) {
    upsertTransaction(transaction: $transactionPatch) {
      id
      date
      customer
      supplier
      total
    }
  }
`;

export const getListQuery = (): string => gql`
  query Query($first: Int, $offset: Int, $sort: String, $desc: Boolean) {
    transactions(first: $first, offset: $offset, sort: $sort, desc: $desc) {
      data {
        id
        customer
        supplier
        date
        total
      }
      totalLength
    }
  }
`;
