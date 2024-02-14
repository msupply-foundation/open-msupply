import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type NewSupplierReturnLinesQueryVariables = Types.Exact<{
  inboundShipmentLineIds?: Types.InputMaybe<Array<Types.Scalars['String']['input']> | Types.Scalars['String']['input']>;
  storeId: Types.Scalars['String']['input'];
}>;


export type NewSupplierReturnLinesQuery = { __typename: 'Queries', newSupplierReturn: Array<{ __typename: 'SupplierReturnLine', availableNumberOfPacks: number, batch?: string | null, expiryDate?: string | null, id: string, itemCode: string, itemName: string, numberOfPacksToReturn: number, packSize: number, stockLineId: string }> };

export type InboundReturnLinesQueryVariables = Types.Exact<{
  outboundShipmentLineIds?: Types.InputMaybe<Array<Types.Scalars['String']['input']> | Types.Scalars['String']['input']>;
  storeId: Types.Scalars['String']['input'];
}>;


export type InboundReturnLinesQuery = { __typename: 'Queries', inboundReturnLines: Array<{ __typename: 'InboundReturnLine', batch?: string | null, expiryDate?: string | null, id: string, itemCode: string, itemName: string, packSize: number, stockLineId: string, numberOfPacksReturned: number, numberOfPacksIssued: number }> };

export type InsertSupplierReturnMutationVariables = Types.Exact<{
  input: Types.SupplierReturnInput;
}>;


export type InsertSupplierReturnMutation = { __typename: 'Mutations', insertSupplierReturn: { __typename: 'InsertSupplierReturnError' } | { __typename: 'InvoiceNode', id: string, invoiceNumber: number } };


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
export const InboundReturnLinesDocument = gql`
    query inboundReturnLines($outboundShipmentLineIds: [String!], $storeId: String!) {
  inboundReturnLines(
    input: {outboundShipmentLineIds: $outboundShipmentLineIds}
    storeId: $storeId
  ) {
    batch
    expiryDate
    id
    itemCode
    itemName
    packSize
    stockLineId
    numberOfPacksReturned
    numberOfPacksIssued
  }
}
    `;
export const InsertSupplierReturnDocument = gql`
    mutation insertSupplierReturn($input: SupplierReturnInput!) {
  insertSupplierReturn(input: $input) {
    ... on InvoiceNode {
      __typename
      id
      invoiceNumber
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    newSupplierReturnLines(variables: NewSupplierReturnLinesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<NewSupplierReturnLinesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<NewSupplierReturnLinesQuery>(NewSupplierReturnLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'newSupplierReturnLines', 'query');
    },
    inboundReturnLines(variables: InboundReturnLinesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InboundReturnLinesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InboundReturnLinesQuery>(InboundReturnLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'inboundReturnLines', 'query');
    },
    insertSupplierReturn(variables: InsertSupplierReturnMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertSupplierReturnMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertSupplierReturnMutation>(InsertSupplierReturnDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertSupplierReturn', 'mutation');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

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

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInboundReturnLinesQuery((req, res, ctx) => {
 *   const { outboundShipmentLineIds, storeId } = req.variables;
 *   return res(
 *     ctx.data({ inboundReturnLines })
 *   )
 * })
 */
export const mockInboundReturnLinesQuery = (resolver: ResponseResolver<GraphQLRequest<InboundReturnLinesQueryVariables>, GraphQLContext<InboundReturnLinesQuery>, any>) =>
  graphql.query<InboundReturnLinesQuery, InboundReturnLinesQueryVariables>(
    'inboundReturnLines',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertSupplierReturnMutation((req, res, ctx) => {
 *   const { input } = req.variables;
 *   return res(
 *     ctx.data({ insertSupplierReturn })
 *   )
 * })
 */
export const mockInsertSupplierReturnMutation = (resolver: ResponseResolver<GraphQLRequest<InsertSupplierReturnMutationVariables>, GraphQLContext<InsertSupplierReturnMutation>, any>) =>
  graphql.mutation<InsertSupplierReturnMutation, InsertSupplierReturnMutationVariables>(
    'insertSupplierReturn',
    resolver
  )
