import * as Types from '../../gql/schema';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type NameRowFragment = {
  __typename: 'NameNode';
  id: string;
  code: string;
  name: string;
};

export type NamesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.NameSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.NameFilterInput>;
}>;

export type NamesQuery = {
  __typename: 'Queries';
  names: {
    __typename: 'NameConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'NameNode';
      id: string;
      code: string;
      name: string;
    }>;
  };
};

export const NameRowFragmentDoc = gql`
  fragment NameRow on NameNode {
    __typename
    id
    code
    name
  }
`;
export const NamesDocument = gql`
  query names(
    $storeId: String!
    $first: Int
    $offset: Int
    $key: NameSortFieldInput!
    $desc: Boolean
    $filter: NameFilterInput
  ) {
    names(
      storeId: $storeId
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
      filter: $filter
    ) {
      ... on NameConnector {
        __typename
        totalCount
        nodes {
          ...NameRow
        }
      }
    }
  }
  ${NameRowFragmentDoc}
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
    names(
      variables: NamesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<NamesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<NamesQuery>({
            document: NamesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'names',
        'query',
        variables,
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
