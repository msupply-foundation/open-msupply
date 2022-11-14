import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type StockLineRowFragment = { __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, locationName?: string | null, onHold: boolean, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, item: { __typename: 'ItemNode', code: string, name: string, unitName?: string | null } };

export type StockLinesQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']>;
  key: Types.StockLineSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  filter?: Types.InputMaybe<Types.StockLineFilterInput>;
  storeId: Types.Scalars['String'];
}>;


export type StockLinesQuery = { __typename: 'Queries', stockLines: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, locationName?: string | null, onHold: boolean, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, item: { __typename: 'ItemNode', code: string, name: string, unitName?: string | null } }> } };

export const StockLineRowFragmentDoc = gql`
    fragment StockLineRow on StockLineNode {
  availableNumberOfPacks
  batch
  costPricePerPack
  expiryDate
  id
  itemId
  locationName
  onHold
  packSize
  sellPricePerPack
  storeId
  totalNumberOfPacks
  item {
    code
    name
    unitName
  }
}
    `;
export const StockLinesDocument = gql`
    query stockLines($first: Int, $offset: Int, $key: StockLineSortFieldInput!, $desc: Boolean, $filter: StockLineFilterInput, $storeId: String!) {
  stockLines(
    storeId: $storeId
    filter: $filter
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
  ) {
    ... on StockLineConnector {
      __typename
      nodes {
        __typename
        ...StockLineRow
      }
      totalCount
    }
  }
}
    ${StockLineRowFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    stockLines(variables: StockLinesQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<StockLinesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<StockLinesQuery>(StockLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'stockLines', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockStockLinesQuery((req, res, ctx) => {
 *   const { first, offset, key, desc, filter, storeId } = req.variables;
 *   return res(
 *     ctx.data({ stockLines })
 *   )
 * })
 */
export const mockStockLinesQuery = (resolver: ResponseResolver<GraphQLRequest<StockLinesQueryVariables>, GraphQLContext<StockLinesQuery>, any>) =>
  graphql.query<StockLinesQuery, StockLinesQueryVariables>(
    'stockLines',
    resolver
  )
