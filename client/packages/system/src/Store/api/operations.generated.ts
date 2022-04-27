import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type StoreRowFragment = { __typename: 'StoreNode', code: string, id: string };

export type StoresQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']>;
  filter?: Types.InputMaybe<Types.StoreFilterInput>;
}>;


export type StoresQuery = { __typename: 'FullQuery', stores: { __typename: 'StoreConnector', totalCount: number, nodes: Array<{ __typename: 'StoreNode', code: string, id: string }> } };

export const StoreRowFragmentDoc = gql`
    fragment StoreRow on StoreNode {
  code
  id
}
    `;
export const StoresDocument = gql`
    query stores($first: Int, $offset: Int, $filter: StoreFilterInput) {
  stores(
    page: {first: $first, offset: $offset}
    filter: $filter
    sort: {key: name}
  ) {
    ... on StoreConnector {
      __typename
      totalCount
      nodes {
        ...StoreRow
      }
    }
  }
}
    ${StoreRowFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    stores(variables?: StoresQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<StoresQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<StoresQuery>(StoresDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'stores', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockStoresQuery((req, res, ctx) => {
 *   const { first, offset, filter } = req.variables;
 *   return res(
 *     ctx.data({ stores })
 *   )
 * })
 */
export const mockStoresQuery = (resolver: ResponseResolver<GraphQLRequest<StoresQueryVariables>, GraphQLContext<StoresQuery>, any>) =>
  graphql.query<StoresQuery, StoresQueryVariables>(
    'stores',
    resolver
  )
