import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
export type StockCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  daysTillExpired?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  timezoneOffset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
}>;


export type StockCountsQuery = { __typename: 'Queries', stockCounts: { __typename: 'StockCounts', expired: number, expiringSoon: number } };

export type ItemCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  lowStockThreshold: Types.Scalars['Int']['input'];
}>;


export type ItemCountsQuery = { __typename: 'Queries', itemCounts: { __typename: 'ItemCounts', itemCounts: { __typename: 'ItemCountsResponse', lowStock: number, noStock: number, moreThanSixMonthsStock: number, total: number } } };

export type RequisitionCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;


export type RequisitionCountsQuery = { __typename: 'Queries', requisitionCounts: { __typename: 'RequisitionCounts', request: { __typename: 'RequestRequisitionCounts', draft: number }, response: { __typename: 'ResponseRequisitionCounts', new: number } } };

export type OutboundShipmentCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  timezoneOffset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
}>;


export type OutboundShipmentCountsQuery = { __typename: 'Queries', invoiceCounts: { __typename: 'InvoiceCounts', outbound: { __typename: 'OutboundInvoiceCounts', notShipped: number, created: { __typename: 'InvoiceCountsSummary', today: number, thisWeek: number } } } };

export type InboundShipmentCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  timezoneOffset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
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
    stockCounts(variables: StockCountsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<StockCountsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<StockCountsQuery>(StockCountsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'stockCounts', 'query');
    },
    itemCounts(variables: ItemCountsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ItemCountsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ItemCountsQuery>(ItemCountsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'itemCounts', 'query');
    },
    requisitionCounts(variables: RequisitionCountsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<RequisitionCountsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<RequisitionCountsQuery>(RequisitionCountsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'requisitionCounts', 'query');
    },
    outboundShipmentCounts(variables: OutboundShipmentCountsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<OutboundShipmentCountsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<OutboundShipmentCountsQuery>(OutboundShipmentCountsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'outboundShipmentCounts', 'query');
    },
    inboundShipmentCounts(variables: InboundShipmentCountsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InboundShipmentCountsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InboundShipmentCountsQuery>(InboundShipmentCountsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'inboundShipmentCounts', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;