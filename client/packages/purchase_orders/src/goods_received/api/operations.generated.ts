import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type GoodsReceivedRowFragment = {
  __typename: 'GoodsReceivedNode';
  id: string;
  number: number;
};

export type GoodsReceivedFragment = {
  __typename: 'GoodsReceivedNode';
  id: string;
  number: number;
};

export type GoodsReceivedListQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.GoodsReceivedSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.GoodsReceivedFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;

export type GoodsReceivedListQuery = {
  __typename: 'Queries';
  goodsReceivedList: {
    __typename: 'GoodsReceivedConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'GoodsReceivedNode';
      id: string;
      number: number;
    }>;
  };
};

export type GoodsReceivedByIdQueryVariables = Types.Exact<{
  GoodsReceivedId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type GoodsReceivedByIdQuery = {
  __typename: 'Queries';
  goodsReceived:
    | { __typename: 'GoodsReceivedNode'; id: string; number: number }
    | { __typename: 'RecordNotFound'; description: string };
};

export const GoodsReceivedRowFragmentDoc = gql`
  fragment GoodsReceivedRow on GoodsReceivedNode {
    id
    number
  }
`;
export const GoodsReceivedFragmentDoc = gql`
  fragment GoodsReceived on GoodsReceivedNode {
    __typename
    id
    number
  }
`;
export const GoodsReceivedListDocument = gql`
  query GoodsReceivedList(
    $first: Int
    $offset: Int
    $key: GoodsReceivedSortFieldInput!
    $desc: Boolean
    $filter: GoodsReceivedFilterInput
    $storeId: String!
  ) {
    goodsReceivedList(
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
      filter: $filter
      storeId: $storeId
    ) {
      ... on GoodsReceivedConnector {
        __typename
        nodes {
          ...GoodsReceivedRow
        }
        totalCount
      }
    }
  }
  ${GoodsReceivedRowFragmentDoc}
`;
export const GoodsReceivedByIdDocument = gql`
  query GoodsReceivedById($GoodsReceivedId: String!, $storeId: String!) {
    goodsReceived(id: $GoodsReceivedId, storeId: $storeId) {
      __typename
      ... on RecordNotFound {
        __typename
        description
      }
      ... on GoodsReceivedNode {
        ...GoodsReceived
      }
    }
  }
  ${GoodsReceivedFragmentDoc}
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string,
  variables?: any
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (
  action,
  _operationName,
  _operationType,
  _variables
) => action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper
) {
  return {
    GoodsReceivedList(
      variables: GoodsReceivedListQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<GoodsReceivedListQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<GoodsReceivedListQuery>(
            GoodsReceivedListDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'GoodsReceivedList',
        'query',
        variables
      );
    },
    GoodsReceivedById(
      variables: GoodsReceivedByIdQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<GoodsReceivedByIdQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<GoodsReceivedByIdQuery>(
            GoodsReceivedByIdDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'GoodsReceivedById',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
