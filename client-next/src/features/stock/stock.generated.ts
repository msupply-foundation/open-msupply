import * as Types from '../../gql/schema';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type StockLineRowFragment = {
  __typename: 'StockLineNode';
  id: string;
  itemId: string;
  batch?: string | null;
  expiryDate?: string | null;
  packSize: number;
  totalNumberOfPacks: number;
  availableNumberOfPacks: number;
  costPricePerPack: number;
  sellPricePerPack: number;
  onHold: boolean;
  locationName?: string | null;
  supplierName?: string | null;
  item: {
    __typename: 'ItemNode';
    id: string;
    code: string;
    name: string;
    unitName?: string | null;
  };
};

export type StockLinesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.StockLineSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.StockLineFilterInput>;
}>;

export type StockLinesQuery = {
  __typename: 'Queries';
  stockLines: {
    __typename: 'StockLineConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'StockLineNode';
      id: string;
      itemId: string;
      batch?: string | null;
      expiryDate?: string | null;
      packSize: number;
      totalNumberOfPacks: number;
      availableNumberOfPacks: number;
      costPricePerPack: number;
      sellPricePerPack: number;
      onHold: boolean;
      locationName?: string | null;
      supplierName?: string | null;
      item: {
        __typename: 'ItemNode';
        id: string;
        code: string;
        name: string;
        unitName?: string | null;
      };
    }>;
  };
};

export type StockLineQueryVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type StockLineQuery = {
  __typename: 'Queries';
  stockLines: {
    __typename: 'StockLineConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'StockLineNode';
      id: string;
      itemId: string;
      batch?: string | null;
      expiryDate?: string | null;
      packSize: number;
      totalNumberOfPacks: number;
      availableNumberOfPacks: number;
      costPricePerPack: number;
      sellPricePerPack: number;
      onHold: boolean;
      locationName?: string | null;
      supplierName?: string | null;
      item: {
        __typename: 'ItemNode';
        id: string;
        code: string;
        name: string;
        unitName?: string | null;
      };
    }>;
  };
};

export const StockLineRowFragmentDoc = gql`
  fragment StockLineRow on StockLineNode {
    __typename
    id
    itemId
    batch
    expiryDate
    packSize
    totalNumberOfPacks
    availableNumberOfPacks
    costPricePerPack
    sellPricePerPack
    onHold
    locationName
    supplierName
    item {
      __typename
      id
      code
      name
      unitName
    }
  }
`;
export const StockLinesDocument = gql`
  query stockLines(
    $storeId: String!
    $first: Int
    $offset: Int
    $key: StockLineSortFieldInput!
    $desc: Boolean
    $filter: StockLineFilterInput
  ) {
    stockLines(
      storeId: $storeId
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
      filter: $filter
    ) {
      ... on StockLineConnector {
        __typename
        totalCount
        nodes {
          ...StockLineRow
        }
      }
    }
  }
  ${StockLineRowFragmentDoc}
`;
export const StockLineDocument = gql`
  query stockLine($id: String!, $storeId: String!) {
    stockLines(storeId: $storeId, filter: { id: { equalTo: $id } }) {
      ... on StockLineConnector {
        __typename
        totalCount
        nodes {
          ...StockLineRow
        }
      }
    }
  }
  ${StockLineRowFragmentDoc}
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
    stockLines(
      variables: StockLinesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<StockLinesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<StockLinesQuery>({
            document: StockLinesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'stockLines',
        'query',
        variables,
      );
    },
    stockLine(
      variables: StockLineQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<StockLineQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<StockLineQuery>({
            document: StockLineDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'stockLine',
        'query',
        variables,
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
