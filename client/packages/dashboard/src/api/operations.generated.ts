import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type StockCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  daysTillExpired?: Types.InputMaybe<Types.Scalars['Int']>;
  timezoneOffset?: Types.InputMaybe<Types.Scalars['Int']>;
}>;


export type StockCountsQuery = { __typename: 'Queries', stockCounts: { __typename: 'StockCounts', expired: number, expiringSoon: number } };

export type ItemCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  lowStockThreshold: Types.Scalars['Int'];
}>;


export type ItemCountsQuery = { __typename: 'Queries', itemCounts: { __typename: 'ItemCounts', itemCounts: { __typename: 'ItemCountsResponse', lowStock: number, noStock: number, moreThanSixMonthsStock: number, total: number } } };

export type RequisitionCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
}>;


export type RequisitionCountsQuery = { __typename: 'Queries', requisitionCounts: { __typename: 'RequisitionCounts', request: { __typename: 'RequestRequisitionCounts', draft: number }, response: { __typename: 'ResponseRequisitionCounts', new: number } } };

export type OutboundShipmentCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  timezoneOffset?: Types.InputMaybe<Types.Scalars['Int']>;
}>;


export type OutboundShipmentCountsQuery = { __typename: 'Queries', invoiceCounts: { __typename: 'InvoiceCounts', outbound: { __typename: 'OutboundInvoiceCounts', notShipped: number, created: { __typename: 'InvoiceCountsSummary', today: number, thisWeek: number } } } };

export type InboundShipmentCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  timezoneOffset?: Types.InputMaybe<Types.Scalars['Int']>;
}>;


export type InboundShipmentCountsQuery = { __typename: 'Queries', invoiceCounts: { __typename: 'InvoiceCounts', inbound: { __typename: 'InboundInvoiceCounts', notDelivered: number, created: { __typename: 'InvoiceCountsSummary', today: number, thisWeek: number } } } };


export const StockCountsDocument = gql`
    query stockCounts($storeId: String!, $daysTillExpired: Int, $timezoneOffset: Int) {
  stockCounts(
    storeId: $storeId
    daysTillExpired: $daysTillExpired
    timezoneOffset: $timezoneOffset
  ) {
    expired
    expiringSoon
  }
}
    `;
export const ItemCountsDocument = gql`
    query itemCounts($storeId: String!, $lowStockThreshold: Int!) {
  itemCounts(lowStockThreshold: $lowStockThreshold, storeId: $storeId) {
    itemCounts {
      lowStock
      noStock
      moreThanSixMonthsStock
      total
    }
  }
}
    `;
export const RequisitionCountsDocument = gql`
    query requisitionCounts($storeId: String!) {
  requisitionCounts(storeId: $storeId) {
    request {
      draft
    }
    response {
      new
    }
  }
}
    `;
export const OutboundShipmentCountsDocument = gql`
    query outboundShipmentCounts($storeId: String!, $timezoneOffset: Int) {
  invoiceCounts(storeId: $storeId, timezoneOffset: $timezoneOffset) {
    outbound {
      created {
        today
        thisWeek
      }
      notShipped
    }
  }
}
    `;
export const InboundShipmentCountsDocument = gql`
    query inboundShipmentCounts($storeId: String!, $timezoneOffset: Int) {
  invoiceCounts(storeId: $storeId, timezoneOffset: $timezoneOffset) {
    inbound {
      created {
        today
        thisWeek
      }
      notDelivered
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    stockCounts(variables: StockCountsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<StockCountsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<StockCountsQuery>(StockCountsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'stockCounts', 'query');
    },
    itemCounts(variables: ItemCountsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<ItemCountsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ItemCountsQuery>(ItemCountsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'itemCounts', 'query');
    },
    requisitionCounts(variables: RequisitionCountsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<RequisitionCountsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<RequisitionCountsQuery>(RequisitionCountsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'requisitionCounts', 'query');
    },
    outboundShipmentCounts(variables: OutboundShipmentCountsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<OutboundShipmentCountsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<OutboundShipmentCountsQuery>(OutboundShipmentCountsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'outboundShipmentCounts', 'query');
    },
    inboundShipmentCounts(variables: InboundShipmentCountsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InboundShipmentCountsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InboundShipmentCountsQuery>(InboundShipmentCountsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'inboundShipmentCounts', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockStockCountsQuery((req, res, ctx) => {
 *   const { storeId, daysTillExpired, timezoneOffset } = req.variables;
 *   return res(
 *     ctx.data({ stockCounts })
 *   )
 * })
 */
export const mockStockCountsQuery = (resolver: ResponseResolver<GraphQLRequest<StockCountsQueryVariables>, GraphQLContext<StockCountsQuery>, any>) =>
  graphql.query<StockCountsQuery, StockCountsQueryVariables>(
    'stockCounts',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockItemCountsQuery((req, res, ctx) => {
 *   const { storeId, lowStockThreshold } = req.variables;
 *   return res(
 *     ctx.data({ itemCounts })
 *   )
 * })
 */
export const mockItemCountsQuery = (resolver: ResponseResolver<GraphQLRequest<ItemCountsQueryVariables>, GraphQLContext<ItemCountsQuery>, any>) =>
  graphql.query<ItemCountsQuery, ItemCountsQueryVariables>(
    'itemCounts',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockRequisitionCountsQuery((req, res, ctx) => {
 *   const { storeId } = req.variables;
 *   return res(
 *     ctx.data({ requisitionCounts })
 *   )
 * })
 */
export const mockRequisitionCountsQuery = (resolver: ResponseResolver<GraphQLRequest<RequisitionCountsQueryVariables>, GraphQLContext<RequisitionCountsQuery>, any>) =>
  graphql.query<RequisitionCountsQuery, RequisitionCountsQueryVariables>(
    'requisitionCounts',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockOutboundShipmentCountsQuery((req, res, ctx) => {
 *   const { storeId, timezoneOffset } = req.variables;
 *   return res(
 *     ctx.data({ invoiceCounts })
 *   )
 * })
 */
export const mockOutboundShipmentCountsQuery = (resolver: ResponseResolver<GraphQLRequest<OutboundShipmentCountsQueryVariables>, GraphQLContext<OutboundShipmentCountsQuery>, any>) =>
  graphql.query<OutboundShipmentCountsQuery, OutboundShipmentCountsQueryVariables>(
    'outboundShipmentCounts',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInboundShipmentCountsQuery((req, res, ctx) => {
 *   const { storeId, timezoneOffset } = req.variables;
 *   return res(
 *     ctx.data({ invoiceCounts })
 *   )
 * })
 */
export const mockInboundShipmentCountsQuery = (resolver: ResponseResolver<GraphQLRequest<InboundShipmentCountsQueryVariables>, GraphQLContext<InboundShipmentCountsQuery>, any>) =>
  graphql.query<InboundShipmentCountsQuery, InboundShipmentCountsQueryVariables>(
    'inboundShipmentCounts',
    resolver
  )
