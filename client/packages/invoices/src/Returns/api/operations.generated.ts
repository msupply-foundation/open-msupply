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

export type NewSupplierReturnLinesQueryVariables = Types.Exact<{
  inboundShipmentLineIds?: Types.InputMaybe<Array<Types.Scalars['String']['input']> | Types.Scalars['String']['input']>;
  storeId: Types.Scalars['String']['input'];
}>;


export type NewSupplierReturnLinesQuery = { __typename: 'Queries', newSupplierReturn: Array<{ __typename: 'SupplierReturnLine', availableNumberOfPacks: number, batch?: string | null, expiryDate?: string | null, id: string, itemCode: string, itemName: string, numberOfPacksToReturn: number, packSize: number, stockLineId: string, comment: string, reasonId?: string | null }> };

export type GenerateInboundReturnLinesQueryVariables = Types.Exact<{
  outboundShipmentLineIds?: Types.InputMaybe<Array<Types.Scalars['String']['input']> | Types.Scalars['String']['input']>;
  storeId: Types.Scalars['String']['input'];
}>;


export type GenerateInboundReturnLinesQuery = { __typename: 'Queries', generateInboundReturnLines: Array<{ __typename: 'InboundReturnLine', batch?: string | null, expiryDate?: string | null, id: string, itemCode: string, itemName: string, packSize: number, stockLineId: string, numberOfPacksReturned: number, numberOfPacksIssued: number, comment: string, reasonId?: string | null }> };

export type InvoiceByNumberQueryVariables = Types.Exact<{
  invoiceNumber: Types.Scalars['Int']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type InvoiceByNumberQuery = { __typename: 'Queries', invoiceByNumber: { __typename: 'InvoiceNode', id: string, invoiceNumber: number, otherPartyName: string, lines: { __typename: 'InvoiceLineConnector', nodes: Array<{ __typename: 'InvoiceLineNode', id: string }> }, otherPartyStore?: { __typename: 'StoreNode', code: string } | null } | { __typename: 'NodeError' } };

export type InsertSupplierReturnMutationVariables = Types.Exact<{
  input: Types.SupplierReturnInput;
}>;


export type InsertSupplierReturnMutation = { __typename: 'Mutations', insertSupplierReturn: { __typename: 'InsertSupplierReturnError' } | { __typename: 'InvoiceNode', id: string, invoiceNumber: number } };

export type InsertInboundReturnMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InboundReturnInput;
}>;


export type InsertInboundReturnMutation = { __typename: 'Mutations', insertInboundReturn: { __typename: 'InsertInboundReturnError' } | { __typename: 'InvoiceNode', id: string, invoiceNumber: number } };

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
    comment
    reasonId
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
    comment
    reasonId
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
export const InsertInboundReturnDocument = gql`
    mutation insertInboundReturn($storeId: String!, $input: InboundReturnInput!) {
  insertInboundReturn(storeId: $storeId, input: $input) {
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
    newSupplierReturnLines(variables: NewSupplierReturnLinesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<NewSupplierReturnLinesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<NewSupplierReturnLinesQuery>(NewSupplierReturnLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'newSupplierReturnLines', 'query');
    },
    generateInboundReturnLines(variables: GenerateInboundReturnLinesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<GenerateInboundReturnLinesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GenerateInboundReturnLinesQuery>(GenerateInboundReturnLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'generateInboundReturnLines', 'query');
    },
    invoiceByNumber(variables: InvoiceByNumberQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InvoiceByNumberQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InvoiceByNumberQuery>(InvoiceByNumberDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'invoiceByNumber', 'query');
    },
    insertSupplierReturn(variables: InsertSupplierReturnMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertSupplierReturnMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertSupplierReturnMutation>(InsertSupplierReturnDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertSupplierReturn', 'mutation');
    },
    insertInboundReturn(variables: InsertInboundReturnMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertInboundReturnMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertInboundReturnMutation>(InsertInboundReturnDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertInboundReturn', 'mutation');
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

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertInboundReturnMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ insertInboundReturn })
 *   )
 * })
 */
export const mockInsertInboundReturnMutation = (resolver: ResponseResolver<GraphQLRequest<InsertInboundReturnMutationVariables>, GraphQLContext<InsertInboundReturnMutation>, any>) =>
  graphql.mutation<InsertInboundReturnMutation, InsertInboundReturnMutationVariables>(
    'insertInboundReturn',
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
