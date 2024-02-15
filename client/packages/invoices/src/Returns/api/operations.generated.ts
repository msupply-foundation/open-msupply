import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type OutboundReturnRowFragment = { __typename: 'InvoiceNode', id: string, otherPartyName: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, createdDatetime: string };

export type OutboundReturnsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.InvoiceSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.InvoiceFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type OutboundReturnsQuery = { __typename: 'Queries', invoices: { __typename: 'InvoiceConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceNode', id: string, otherPartyName: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, createdDatetime: string }> } };

export type NewSupplierReturnLinesQueryVariables = Types.Exact<{
  inboundShipmentLineIds?: Types.InputMaybe<Array<Types.Scalars['String']['input']> | Types.Scalars['String']['input']>;
  storeId: Types.Scalars['String']['input'];
}>;


export type NewSupplierReturnLinesQuery = { __typename: 'Queries', newSupplierReturn: Array<{ __typename: 'SupplierReturnLine', availableNumberOfPacks: number, batch?: string | null, expiryDate?: string | null, id: string, itemCode: string, itemName: string, numberOfPacksToReturn: number, packSize: number, stockLineId: string }> };

export const OutboundReturnRowFragmentDoc = gql`
    fragment OutboundReturnRow on InvoiceNode {
  __typename
  id
  otherPartyName
  status
  invoiceNumber
  colour
  createdDatetime
}
    `;
export const OutboundReturnsDocument = gql`
    query outboundReturns($first: Int, $offset: Int, $key: InvoiceSortFieldInput!, $desc: Boolean, $filter: InvoiceFilterInput, $storeId: String!) {
  invoices(
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
    storeId: $storeId
  ) {
    ... on InvoiceConnector {
      __typename
      nodes {
        ...OutboundReturnRow
      }
      totalCount
    }
  }
}
    ${OutboundReturnRowFragmentDoc}`;
export const NewSupplierReturnLinesDocument = gql`
    query newSupplierReturnLines($inboundShipmentLineIds: [String!], $storeId: String!) {
  newSupplierReturn(
    input: {inboundShipmentLineIds: $inboundShipmentLineIds}
    storeId: $storeId
  ) {
    availableNumberOfPacks
    batch
    expiryDate
    id
    itemCode
    itemName
    numberOfPacksToReturn
    packSize
    stockLineId
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    outboundReturns(variables: OutboundReturnsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<OutboundReturnsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<OutboundReturnsQuery>(OutboundReturnsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'outboundReturns', 'query');
    },
    newSupplierReturnLines(variables: NewSupplierReturnLinesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<NewSupplierReturnLinesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<NewSupplierReturnLinesQuery>(NewSupplierReturnLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'newSupplierReturnLines', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockOutboundReturnsQuery((req, res, ctx) => {
 *   const { first, offset, key, desc, filter, storeId } = req.variables;
 *   return res(
 *     ctx.data({ invoices })
 *   )
 * })
 */
export const mockOutboundReturnsQuery = (resolver: ResponseResolver<GraphQLRequest<OutboundReturnsQueryVariables>, GraphQLContext<OutboundReturnsQuery>, any>) =>
  graphql.query<OutboundReturnsQuery, OutboundReturnsQueryVariables>(
    'outboundReturns',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockNewSupplierReturnLinesQuery((req, res, ctx) => {
 *   const { inboundShipmentLineIds, storeId } = req.variables;
 *   return res(
 *     ctx.data({ newSupplierReturn })
 *   )
 * })
 */
export const mockNewSupplierReturnLinesQuery = (resolver: ResponseResolver<GraphQLRequest<NewSupplierReturnLinesQueryVariables>, GraphQLContext<NewSupplierReturnLinesQuery>, any>) =>
  graphql.query<NewSupplierReturnLinesQuery, NewSupplierReturnLinesQueryVariables>(
    'newSupplierReturnLines',
    resolver
  )
