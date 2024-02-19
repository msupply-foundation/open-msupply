import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type OutboundReturnRowFragment = { __typename: 'InvoiceNode', id: string, otherPartyName: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, createdDatetime: string };

export type InboundReturnRowFragment = { __typename: 'InvoiceNode', id: string, otherPartyName: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, createdDatetime: string, deliveredDatetime?: string | null };

export type OutboundReturnsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.InvoiceSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.InvoiceFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type OutboundReturnsQuery = { __typename: 'Queries', invoices: { __typename: 'InvoiceConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceNode', id: string, otherPartyName: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, createdDatetime: string }> } };

export type InboundReturnsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.InvoiceSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.InvoiceFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type InboundReturnsQuery = { __typename: 'Queries', invoices: { __typename: 'InvoiceConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceNode', id: string, otherPartyName: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, createdDatetime: string, deliveredDatetime?: string | null }> } };

export type GenerateOutboundReturnLinesQueryVariables = Types.Exact<{
  inboundShipmentLineIds?: Types.InputMaybe<Array<Types.Scalars['String']['input']> | Types.Scalars['String']['input']>;
  storeId: Types.Scalars['String']['input'];
}>;


export type GenerateOutboundReturnLinesQuery = { __typename: 'Queries', newSupplierReturn: Array<{ __typename: 'SupplierReturnLine', availableNumberOfPacks: number, batch?: string | null, expiryDate?: string | null, id: string, itemCode: string, itemName: string, numberOfPacksToReturn: number, packSize: number, stockLineId: string }> };

export type GenerateInboundReturnLinesQueryVariables = Types.Exact<{
  outboundShipmentLineIds?: Types.InputMaybe<Array<Types.Scalars['String']['input']> | Types.Scalars['String']['input']>;
  storeId: Types.Scalars['String']['input'];
}>;


export type GenerateInboundReturnLinesQuery = { __typename: 'Queries', generateInboundReturnLines: Array<{ __typename: 'InboundReturnLine', batch?: string | null, expiryDate?: string | null, id: string, itemCode: string, itemName: string, packSize: number, stockLineId: string, numberOfPacksReturned: number, numberOfPacksIssued: number }> };

export type InvoiceByNumberQueryVariables = Types.Exact<{
  invoiceNumber: Types.Scalars['Int']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type InvoiceByNumberQuery = { __typename: 'Queries', invoiceByNumber: { __typename: 'InvoiceNode', id: string, invoiceNumber: number, otherPartyName: string, lines: { __typename: 'InvoiceLineConnector', nodes: Array<{ __typename: 'InvoiceLineNode', id: string }> }, otherPartyStore?: { __typename: 'StoreNode', code: string } | null } | { __typename: 'NodeError' } };

export type InsertOutboundReturnMutationVariables = Types.Exact<{
  input: Types.SupplierReturnInput;
}>;


export type InsertOutboundReturnMutation = { __typename: 'Mutations', insertSupplierReturn: { __typename: 'InsertSupplierReturnError' } | { __typename: 'InvoiceNode', id: string, invoiceNumber: number } };

export type DeleteOutboundReturnsMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Array<Types.DeleteSupplierReturnInput> | Types.DeleteSupplierReturnInput;
}>;


export type DeleteOutboundReturnsMutation = { __typename: 'Mutations', deleteSupplierReturns: { __typename: 'DeleteSupplierReturnError' } | { __typename: 'DeletedIdsResponse', deletedIds: Array<string> } };

export type DeleteInboundReturnsMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Array<Types.DeleteCustomerReturnInput> | Types.DeleteCustomerReturnInput;
}>;


export type DeleteInboundReturnsMutation = { __typename: 'Mutations', deleteCustomerReturns: { __typename: 'DeleteCustomerReturnError' } | { __typename: 'DeletedIdsResponse', deletedIds: Array<string> } };

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
export const InboundReturnRowFragmentDoc = gql`
    fragment InboundReturnRow on InvoiceNode {
  __typename
  id
  otherPartyName
  status
  invoiceNumber
  colour
  createdDatetime
  deliveredDatetime
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
export const InboundReturnsDocument = gql`
    query inboundReturns($first: Int, $offset: Int, $key: InvoiceSortFieldInput!, $desc: Boolean, $filter: InvoiceFilterInput, $storeId: String!) {
  invoices(
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
    storeId: $storeId
  ) {
    ... on InvoiceConnector {
      __typename
      nodes {
        ...InboundReturnRow
      }
      totalCount
    }
  }
}
    ${InboundReturnRowFragmentDoc}`;
export const GenerateOutboundReturnLinesDocument = gql`
    query generateOutboundReturnLines($inboundShipmentLineIds: [String!], $storeId: String!) {
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
export const GenerateInboundReturnLinesDocument = gql`
    query generateInboundReturnLines($outboundShipmentLineIds: [String!], $storeId: String!) {
  generateInboundReturnLines(
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
export const InvoiceByNumberDocument = gql`
    query invoiceByNumber($invoiceNumber: Int!, $storeId: String!) {
  invoiceByNumber(
    invoiceNumber: $invoiceNumber
    storeId: $storeId
    type: SUPPLIER_RETURN
  ) {
    ... on InvoiceNode {
      id
      invoiceNumber
      lines {
        nodes {
          id
        }
      }
      otherPartyName
      otherPartyStore {
        code
      }
    }
  }
}
    `;
export const InsertOutboundReturnDocument = gql`
    mutation insertOutboundReturn($input: SupplierReturnInput!) {
  insertSupplierReturn(input: $input) {
    ... on InvoiceNode {
      __typename
      id
      invoiceNumber
    }
  }
}
    `;
export const DeleteOutboundReturnsDocument = gql`
    mutation deleteOutboundReturns($storeId: String!, $input: [DeleteSupplierReturnInput!]!) {
  deleteSupplierReturns(storeId: $storeId, input: $input) {
    __typename
    ... on DeletedIdsResponse {
      deletedIds
    }
  }
}
    `;
export const DeleteInboundReturnsDocument = gql`
    mutation deleteInboundReturns($storeId: String!, $input: [DeleteCustomerReturnInput!]!) {
  deleteCustomerReturns(storeId: $storeId, input: $input) {
    __typename
    ... on DeletedIdsResponse {
      deletedIds
    }
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
    inboundReturns(variables: InboundReturnsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InboundReturnsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InboundReturnsQuery>(InboundReturnsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'inboundReturns', 'query');
    },
    generateOutboundReturnLines(variables: GenerateOutboundReturnLinesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<GenerateOutboundReturnLinesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GenerateOutboundReturnLinesQuery>(GenerateOutboundReturnLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'generateOutboundReturnLines', 'query');
    },
    generateInboundReturnLines(variables: GenerateInboundReturnLinesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<GenerateInboundReturnLinesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GenerateInboundReturnLinesQuery>(GenerateInboundReturnLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'generateInboundReturnLines', 'query');
    },
    invoiceByNumber(variables: InvoiceByNumberQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InvoiceByNumberQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InvoiceByNumberQuery>(InvoiceByNumberDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'invoiceByNumber', 'query');
    },
    insertOutboundReturn(variables: InsertOutboundReturnMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertOutboundReturnMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertOutboundReturnMutation>(InsertOutboundReturnDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertOutboundReturn', 'mutation');
    },
    deleteOutboundReturns(variables: DeleteOutboundReturnsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteOutboundReturnsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteOutboundReturnsMutation>(DeleteOutboundReturnsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteOutboundReturns', 'mutation');
    },
    deleteInboundReturns(variables: DeleteInboundReturnsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteInboundReturnsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteInboundReturnsMutation>(DeleteInboundReturnsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteInboundReturns', 'mutation');
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
 * mockInboundReturnsQuery((req, res, ctx) => {
 *   const { first, offset, key, desc, filter, storeId } = req.variables;
 *   return res(
 *     ctx.data({ invoices })
 *   )
 * })
 */
export const mockInboundReturnsQuery = (resolver: ResponseResolver<GraphQLRequest<InboundReturnsQueryVariables>, GraphQLContext<InboundReturnsQuery>, any>) =>
  graphql.query<InboundReturnsQuery, InboundReturnsQueryVariables>(
    'inboundReturns',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockGenerateOutboundReturnLinesQuery((req, res, ctx) => {
 *   const { inboundShipmentLineIds, storeId } = req.variables;
 *   return res(
 *     ctx.data({ newSupplierReturn })
 *   )
 * })
 */
export const mockGenerateOutboundReturnLinesQuery = (resolver: ResponseResolver<GraphQLRequest<GenerateOutboundReturnLinesQueryVariables>, GraphQLContext<GenerateOutboundReturnLinesQuery>, any>) =>
  graphql.query<GenerateOutboundReturnLinesQuery, GenerateOutboundReturnLinesQueryVariables>(
    'generateOutboundReturnLines',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockGenerateInboundReturnLinesQuery((req, res, ctx) => {
 *   const { outboundShipmentLineIds, storeId } = req.variables;
 *   return res(
 *     ctx.data({ generateInboundReturnLines })
 *   )
 * })
 */
export const mockGenerateInboundReturnLinesQuery = (resolver: ResponseResolver<GraphQLRequest<GenerateInboundReturnLinesQueryVariables>, GraphQLContext<GenerateInboundReturnLinesQuery>, any>) =>
  graphql.query<GenerateInboundReturnLinesQuery, GenerateInboundReturnLinesQueryVariables>(
    'generateInboundReturnLines',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInvoiceByNumberQuery((req, res, ctx) => {
 *   const { invoiceNumber, storeId } = req.variables;
 *   return res(
 *     ctx.data({ invoiceByNumber })
 *   )
 * })
 */
export const mockInvoiceByNumberQuery = (resolver: ResponseResolver<GraphQLRequest<InvoiceByNumberQueryVariables>, GraphQLContext<InvoiceByNumberQuery>, any>) =>
  graphql.query<InvoiceByNumberQuery, InvoiceByNumberQueryVariables>(
    'invoiceByNumber',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertOutboundReturnMutation((req, res, ctx) => {
 *   const { input } = req.variables;
 *   return res(
 *     ctx.data({ insertSupplierReturn })
 *   )
 * })
 */
export const mockInsertOutboundReturnMutation = (resolver: ResponseResolver<GraphQLRequest<InsertOutboundReturnMutationVariables>, GraphQLContext<InsertOutboundReturnMutation>, any>) =>
  graphql.mutation<InsertOutboundReturnMutation, InsertOutboundReturnMutationVariables>(
    'insertOutboundReturn',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeleteOutboundReturnsMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ deleteSupplierReturns })
 *   )
 * })
 */
export const mockDeleteOutboundReturnsMutation = (resolver: ResponseResolver<GraphQLRequest<DeleteOutboundReturnsMutationVariables>, GraphQLContext<DeleteOutboundReturnsMutation>, any>) =>
  graphql.mutation<DeleteOutboundReturnsMutation, DeleteOutboundReturnsMutationVariables>(
    'deleteOutboundReturns',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeleteInboundReturnsMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ deleteCustomerReturns })
 *   )
 * })
 */
export const mockDeleteInboundReturnsMutation = (resolver: ResponseResolver<GraphQLRequest<DeleteInboundReturnsMutationVariables>, GraphQLContext<DeleteInboundReturnsMutation>, any>) =>
  graphql.mutation<DeleteInboundReturnsMutation, DeleteInboundReturnsMutationVariables>(
    'deleteInboundReturns',
    resolver
  )
