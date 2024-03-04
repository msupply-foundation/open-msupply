import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type OutboundReturnRowFragment = { __typename: 'InvoiceNode', id: string, otherPartyName: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, createdDatetime: string };

export type InboundReturnRowFragment = { __typename: 'InvoiceNode', id: string, otherPartyName: string, status: Types.InvoiceNodeStatus, invoiceNumber: number, colour?: string | null, createdDatetime: string, deliveredDatetime?: string | null };

export type OutboundReturnDetailRowFragment = { __typename: 'InvoiceLineNode', id: string, itemCode: string, itemName: string, batch?: string | null, expiryDate?: string | null, numberOfPacks: number, packSize: number, sellPricePerPack: number };

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
  stockLineIds?: Types.InputMaybe<Array<Types.Scalars['String']['input']> | Types.Scalars['String']['input']>;
  storeId: Types.Scalars['String']['input'];
}>;


export type GenerateOutboundReturnLinesQuery = { __typename: 'Queries', generateOutboundReturnLines: { __typename: 'OutboundReturnLineConnector', nodes: Array<{ __typename: 'OutboundReturnLineNode', availableNumberOfPacks: number, batch?: string | null, expiryDate?: string | null, id: string, itemCode: string, itemName: string, numberOfPacksToReturn: number, packSize: number, stockLineId: string, note?: string | null, reasonId?: string | null }> } };

export type GenerateInboundReturnLinesQueryVariables = Types.Exact<{
  input: Types.GenerateInboundReturnLinesInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type GenerateInboundReturnLinesQuery = { __typename: 'Queries', generateInboundReturnLines: { __typename: 'InboundReturnLineConnector', nodes: Array<{ __typename: 'InboundReturnLineNode', batch?: string | null, expiryDate?: string | null, id: string, itemCode: string, itemName: string, packSize: number, stockLineId: string, numberOfPacksReturned: number, numberOfPacksIssued: number, note?: string | null, reasonId?: string | null }> } };

export type OutboundReturnByNumberQueryVariables = Types.Exact<{
  invoiceNumber: Types.Scalars['Int']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type OutboundReturnByNumberQuery = { __typename: 'Queries', invoiceByNumber: { __typename: 'InvoiceNode', id: string, invoiceNumber: number, otherPartyName: string, lines: { __typename: 'InvoiceLineConnector', nodes: Array<{ __typename: 'InvoiceLineNode', id: string, itemCode: string, itemName: string, batch?: string | null, expiryDate?: string | null, numberOfPacks: number, packSize: number, sellPricePerPack: number }> }, otherPartyStore?: { __typename: 'StoreNode', code: string } | null } | { __typename: 'NodeError' } };

export type InsertOutboundReturnMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.OutboundReturnInput;
}>;


export type InsertOutboundReturnMutation = { __typename: 'Mutations', insertOutboundReturn: { __typename: 'InsertOutboundReturnError', error: { __typename: 'OtherPartyNotASupplier', description: string } | { __typename: 'OtherPartyNotVisible', description: string } } | { __typename: 'InvoiceNode', id: string, invoiceNumber: number } };

export type InsertInboundReturnMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InboundReturnInput;
}>;


export type InsertInboundReturnMutation = { __typename: 'Mutations', insertInboundReturn: { __typename: 'InsertInboundReturnError' } | { __typename: 'InvoiceNode', id: string, invoiceNumber: number } };

export type DeleteOutboundReturnsMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Array<Types.DeleteOutboundReturnInput> | Types.DeleteOutboundReturnInput;
}>;


export type DeleteOutboundReturnsMutation = { __typename: 'Mutations', deleteOutboundReturns: { __typename: 'DeleteOutboundReturnError' } | { __typename: 'DeletedIdsResponse', deletedIds: Array<string> } };

export type DeleteInboundReturnsMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Array<Types.DeleteInboundReturnInput> | Types.DeleteInboundReturnInput;
}>;


export type DeleteInboundReturnsMutation = { __typename: 'Mutations', deleteInboundReturns: { __typename: 'DeleteInboundReturnError' } | { __typename: 'DeletedIdsResponse', deletedIds: Array<string> } };

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
export const OutboundReturnDetailRowFragmentDoc = gql`
    fragment OutboundReturnDetailRow on InvoiceLineNode {
  id
  itemCode
  itemName
  batch
  expiryDate
  numberOfPacks
  packSize
  sellPricePerPack
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
    query generateOutboundReturnLines($stockLineIds: [String!], $storeId: String!) {
  generateOutboundReturnLines(
    input: {stockLineIds: $stockLineIds}
    storeId: $storeId
  ) {
    ... on OutboundReturnLineConnector {
      nodes {
        availableNumberOfPacks
        batch
        expiryDate
        id
        itemCode
        itemName
        numberOfPacksToReturn
        packSize
        stockLineId
        note
        reasonId
      }
    }
  }
}
    `;
export const GenerateInboundReturnLinesDocument = gql`
    query generateInboundReturnLines($input: GenerateInboundReturnLinesInput!, $storeId: String!) {
  generateInboundReturnLines(input: $input, storeId: $storeId) {
    ... on InboundReturnLineConnector {
      nodes {
        batch
        expiryDate
        id
        itemCode
        itemName
        packSize
        stockLineId
        numberOfPacksReturned
        numberOfPacksIssued
        note
        reasonId
      }
    }
  }
}
    `;
export const OutboundReturnByNumberDocument = gql`
    query outboundReturnByNumber($invoiceNumber: Int!, $storeId: String!) {
  invoiceByNumber(
    invoiceNumber: $invoiceNumber
    storeId: $storeId
    type: OUTBOUND_RETURN
  ) {
    ... on InvoiceNode {
      __typename
      id
      invoiceNumber
      lines {
        nodes {
          ...OutboundReturnDetailRow
        }
      }
      otherPartyName
      otherPartyStore {
        code
      }
    }
  }
}
    ${OutboundReturnDetailRowFragmentDoc}`;
export const InsertOutboundReturnDocument = gql`
    mutation insertOutboundReturn($storeId: String!, $input: OutboundReturnInput!) {
  insertOutboundReturn(storeId: $storeId, input: $input) {
    ... on InvoiceNode {
      __typename
      id
      invoiceNumber
    }
    ... on InsertOutboundReturnError {
      __typename
      error {
        __typename
        description
      }
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
    mutation deleteOutboundReturns($storeId: String!, $input: [DeleteOutboundReturnInput!]!) {
  deleteOutboundReturns(storeId: $storeId, input: $input) {
    __typename
    ... on DeletedIdsResponse {
      deletedIds
    }
  }
}
    `;
export const DeleteInboundReturnsDocument = gql`
    mutation deleteInboundReturns($storeId: String!, $input: [DeleteInboundReturnInput!]!) {
  deleteInboundReturns(storeId: $storeId, input: $input) {
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
    outboundReturnByNumber(variables: OutboundReturnByNumberQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<OutboundReturnByNumberQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<OutboundReturnByNumberQuery>(OutboundReturnByNumberDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'outboundReturnByNumber', 'query');
    },
    insertOutboundReturn(variables: InsertOutboundReturnMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertOutboundReturnMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertOutboundReturnMutation>(InsertOutboundReturnDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertOutboundReturn', 'mutation');
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
 * mockGenerateOutboundReturnLinesQuery((req, res, ctx) => {
 *   const { stockLineIds, storeId } = req.variables;
 *   return res(
 *     ctx.data({ generateOutboundReturnLines })
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
 *   const { input, storeId } = req.variables;
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
 * mockOutboundReturnByNumberQuery((req, res, ctx) => {
 *   const { invoiceNumber, storeId } = req.variables;
 *   return res(
 *     ctx.data({ invoiceByNumber })
 *   )
 * })
 */
export const mockOutboundReturnByNumberQuery = (resolver: ResponseResolver<GraphQLRequest<OutboundReturnByNumberQueryVariables>, GraphQLContext<OutboundReturnByNumberQuery>, any>) =>
  graphql.query<OutboundReturnByNumberQuery, OutboundReturnByNumberQueryVariables>(
    'outboundReturnByNumber',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertOutboundReturnMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ insertOutboundReturn })
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
 *     ctx.data({ deleteOutboundReturns })
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
 *     ctx.data({ deleteInboundReturns })
 *   )
 * })
 */
export const mockDeleteInboundReturnsMutation = (resolver: ResponseResolver<GraphQLRequest<DeleteInboundReturnsMutationVariables>, GraphQLContext<DeleteInboundReturnsMutation>, any>) =>
  graphql.mutation<DeleteInboundReturnsMutation, DeleteInboundReturnsMutationVariables>(
    'deleteInboundReturns',
    resolver
  )
