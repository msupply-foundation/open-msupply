import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type MasterListsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']>;
  key: Types.MasterListSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  filter?: Types.InputMaybe<Types.MasterListFilterInput>;
  storeId: Types.Scalars['String'];
}>;


export type MasterListsQuery = { __typename: 'FullQuery', masterLists: { __typename: 'MasterListConnector', totalCount: number, nodes: Array<{ __typename: 'MasterListNode', name: string, code: string, description: string, id: string, lines: { __typename: 'MasterListLineConnector', totalCount: number, nodes: Array<{ __typename: 'MasterListLineNode', id: string, itemId: string, item: { __typename: 'ItemNode', code: string, id: string, unitName?: string | null, name: string, isVisible: boolean, availableBatches: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, itemId: string, id: string, totalNumberOfPacks: number, storeId: string, sellPricePerPack: number, packSize: number, onHold: boolean, note?: string | null, locationName?: string | null }> } } }> } }> } };


export const MasterListsDocument = gql`
    query masterLists($first: Int, $offset: Int, $key: MasterListSortFieldInput!, $desc: Boolean, $filter: MasterListFilterInput, $storeId: String!) {
  masterLists(
    filter: $filter
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    storeId: $storeId
  ) {
    ... on MasterListConnector {
      __typename
      totalCount
      nodes {
        name
        code
        description
        id
        lines {
          __typename
          totalCount
          nodes {
            id
            itemId
            item {
              code
              id
              unitName
              name
              isVisible
              availableBatches(storeId: $storeId) {
                __typename
                totalCount
                nodes {
                  __typename
                  availableNumberOfPacks
                  batch
                  costPricePerPack
                  expiryDate
                  itemId
                  id
                  totalNumberOfPacks
                  storeId
                  sellPricePerPack
                  packSize
                  onHold
                  note
                  locationName
                }
              }
            }
          }
        }
      }
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    masterLists(variables: MasterListsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<MasterListsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<MasterListsQuery>(MasterListsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'masterLists');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockMasterListsQuery((req, res, ctx) => {
 *   const { first, offset, key, desc, filter, storeId } = req.variables;
 *   return res(
 *     ctx.data({ masterLists })
 *   )
 * })
 */
export const mockMasterListsQuery = (resolver: ResponseResolver<GraphQLRequest<MasterListsQueryVariables>, GraphQLContext<MasterListsQuery>, any>) =>
  graphql.query<MasterListsQuery, MasterListsQueryVariables>(
    'masterLists',
    resolver
  )
