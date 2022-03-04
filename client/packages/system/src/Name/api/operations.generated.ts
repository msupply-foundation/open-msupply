import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type NameRowFragment = { __typename: 'NameNode', code: string, id: string, isCustomer: boolean, isSupplier: boolean, name: string, store?: { __typename: 'StoreNode', id: string, code: string } | null };

export type NamesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  key: Types.NameSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  first?: Types.InputMaybe<Types.Scalars['Int']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']>;
  filter?: Types.InputMaybe<Types.NameFilterInput>;
}>;


export type NamesQuery = { __typename: 'FullQuery', names: { __typename: 'NameConnector', totalCount: number, nodes: Array<{ __typename: 'NameNode', code: string, id: string, isCustomer: boolean, isSupplier: boolean, name: string, store?: { __typename: 'StoreNode', id: string, code: string } | null }> } };

export const NameRowFragmentDoc = gql`
    fragment NameRow on NameNode {
  code
  id
  isCustomer
  isSupplier
  name
  store {
    id
    code
  }
}
    `;
export const NamesDocument = gql`
    query names($storeId: String!, $key: NameSortFieldInput!, $desc: Boolean, $first: Int, $offset: Int, $filter: NameFilterInput) {
  names(
    storeId: $storeId
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
  ) {
    ... on NameConnector {
      __typename
      nodes {
        ...NameRow
      }
      totalCount
    }
  }
}
    ${NameRowFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    names(variables: NamesQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<NamesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<NamesQuery>(NamesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'names');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockNamesQuery((req, res, ctx) => {
 *   const { storeId, key, desc, first, offset, filter } = req.variables;
 *   return res(
 *     ctx.data({ names })
 *   )
 * })
 */
export const mockNamesQuery = (resolver: ResponseResolver<GraphQLRequest<NamesQueryVariables>, GraphQLContext<NamesQuery>, any>) =>
  graphql.query<NamesQuery, NamesQueryVariables>(
    'names',
    resolver
  )
