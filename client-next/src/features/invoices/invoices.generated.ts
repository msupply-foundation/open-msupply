import * as Types from '../../gql/schema';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type InvoiceRowFragment = {
  __typename: 'InvoiceNode';
  id: string;
  invoiceNumber: number;
  otherPartyName: string;
  status: Types.InvoiceNodeStatus;
  type: Types.InvoiceNodeType;
  createdDatetime: string;
  deliveredDatetime?: string | null;
  theirReference?: string | null;
  comment?: string | null;
  pricing: { __typename: 'PricingNode'; totalAfterTax: number };
};

export type InvoicesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.InvoiceSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.InvoiceFilterInput>;
}>;

export type InvoicesQuery = {
  __typename: 'Queries';
  invoices: {
    __typename: 'InvoiceConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'InvoiceNode';
      id: string;
      invoiceNumber: number;
      otherPartyName: string;
      status: Types.InvoiceNodeStatus;
      type: Types.InvoiceNodeType;
      createdDatetime: string;
      deliveredDatetime?: string | null;
      theirReference?: string | null;
      comment?: string | null;
      pricing: { __typename: 'PricingNode'; totalAfterTax: number };
    }>;
  };
};

export const InvoiceRowFragmentDoc = gql`
  fragment InvoiceRow on InvoiceNode {
    __typename
    id
    invoiceNumber
    otherPartyName
    status
    type
    createdDatetime
    deliveredDatetime
    theirReference
    comment
    pricing {
      __typename
      totalAfterTax
    }
  }
`;
export const InvoicesDocument = gql`
  query invoices(
    $storeId: String!
    $first: Int
    $offset: Int
    $key: InvoiceSortFieldInput!
    $desc: Boolean
    $filter: InvoiceFilterInput
  ) {
    invoices(
      storeId: $storeId
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
      filter: $filter
    ) {
      ... on InvoiceConnector {
        __typename
        totalCount
        nodes {
          ...InvoiceRow
        }
      }
    }
  }
  ${InvoiceRowFragmentDoc}
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string,
  variables?: any,
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (
  action,
  _operationName,
  _operationType,
  _variables,
) => action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper,
) {
  return {
    invoices(
      variables: InvoicesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<InvoicesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InvoicesQuery>({
            document: InvoicesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'invoices',
        'query',
        variables,
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
