import * as Types from '../../gql/schema';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type RequisitionRowFragment = {
  __typename: 'RequisitionNode';
  id: string;
  requisitionNumber: number;
  otherPartyName: string;
  status: Types.RequisitionNodeStatus;
  type: Types.RequisitionNodeType;
  createdDatetime: string;
  theirReference?: string | null;
  comment?: string | null;
  lines: { __typename: 'RequisitionLineConnector'; totalCount: number };
  shipments: { __typename: 'InvoiceConnector'; totalCount: number };
};

export type RequisitionsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.RequisitionSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.RequisitionFilterInput>;
}>;

export type RequisitionsQuery = {
  __typename: 'Queries';
  requisitions: {
    __typename: 'RequisitionConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'RequisitionNode';
      id: string;
      requisitionNumber: number;
      otherPartyName: string;
      status: Types.RequisitionNodeStatus;
      type: Types.RequisitionNodeType;
      createdDatetime: string;
      theirReference?: string | null;
      comment?: string | null;
      lines: { __typename: 'RequisitionLineConnector'; totalCount: number };
      shipments: { __typename: 'InvoiceConnector'; totalCount: number };
    }>;
  };
};

export const RequisitionRowFragmentDoc = gql`
  fragment RequisitionRow on RequisitionNode {
    __typename
    id
    requisitionNumber
    otherPartyName
    status
    type
    createdDatetime
    theirReference
    comment
    lines {
      __typename
      totalCount
    }
    shipments {
      __typename
      totalCount
    }
  }
`;
export const RequisitionsDocument = gql`
  query requisitions(
    $storeId: String!
    $first: Int
    $offset: Int
    $key: RequisitionSortFieldInput!
    $desc: Boolean
    $filter: RequisitionFilterInput
  ) {
    requisitions(
      storeId: $storeId
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
      filter: $filter
    ) {
      ... on RequisitionConnector {
        __typename
        totalCount
        nodes {
          ...RequisitionRow
        }
      }
    }
  }
  ${RequisitionRowFragmentDoc}
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
    requisitions(
      variables: RequisitionsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<RequisitionsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<RequisitionsQuery>({
            document: RequisitionsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'requisitions',
        'query',
        variables,
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
