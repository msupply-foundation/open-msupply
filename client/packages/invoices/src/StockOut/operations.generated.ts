import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type PartialStockLineFragment = { __typename: 'StockLineNode', id: string, itemId: string, availableNumberOfPacks: number, totalNumberOfPacks: number, onHold: boolean, sellPricePerPack: number, packSize: number, expiryDate?: string | null, item: { __typename: 'ItemNode', name: string, code: string }, location?: { __typename: 'LocationNode', id: string, name: string, code: string, onHold: boolean } | null };

export type StockOutLineFragment = { __typename: 'InvoiceLineNode', id: string, type: Types.InvoiceLineNodeType, batch?: string | null, expiryDate?: string | null, numberOfPacks: number, packSize: number, invoiceId: string, sellPricePerPack: number, note?: string | null, totalBeforeTax: number, totalAfterTax: number, taxRate?: number | null, itemName: string, item: { __typename: 'ItemNode', id: string, name: string, code: string, unitName?: string | null }, location?: { __typename: 'LocationNode', id: string, name: string, code: string, onHold: boolean } | null, stockLine?: { __typename: 'StockLineNode', id: string, itemId: string, batch?: string | null, availableNumberOfPacks: number, totalNumberOfPacks: number, onHold: boolean, sellPricePerPack: number, packSize: number, expiryDate?: string | null, item: { __typename: 'ItemNode', name: string, code: string } } | null };

export type DummyQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type DummyQuery = { __typename: 'Queries', dummy: { __typename: 'UserNode' } };

export const PartialStockLineFragmentDoc = gql`
    fragment PartialStockLine on StockLineNode {
  id
  itemId
  availableNumberOfPacks
  totalNumberOfPacks
  onHold
  sellPricePerPack
  packSize
  expiryDate
  item {
    name
    code
  }
  location {
    __typename
    id
    name
    code
    onHold
  }
}
    `;
export const StockOutLineFragmentDoc = gql`
    fragment StockOutLine on InvoiceLineNode {
  __typename
  id
  type
  batch
  expiryDate
  numberOfPacks
  packSize
  invoiceId
  sellPricePerPack
  note
  totalBeforeTax
  totalAfterTax
  taxRate
  note
  itemName
  item {
    __typename
    id
    name
    code
    unitName
  }
  location {
    __typename
    id
    name
    code
    onHold
  }
  stockLine {
    __typename
    id
    itemId
    batch
    availableNumberOfPacks
    totalNumberOfPacks
    onHold
    sellPricePerPack
    packSize
    expiryDate
    item {
      name
      code
    }
  }
}
    `;
export const DummyDocument = gql`
    query dummy {
  dummy: me {
    __typename
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    dummy(variables?: DummyQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DummyQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DummyQuery>(DummyDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'dummy', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDummyQuery((req, res, ctx) => {
 *   return res(
 *     ctx.data({ me })
 *   )
 * })
 */
export const mockDummyQuery = (resolver: ResponseResolver<GraphQLRequest<DummyQueryVariables>, GraphQLContext<DummyQuery>, any>) =>
  graphql.query<DummyQuery, DummyQueryVariables>(
    'dummy',
    resolver
  )
