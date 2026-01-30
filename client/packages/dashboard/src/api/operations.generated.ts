import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type StockCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  daysTillExpired?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  timezoneOffset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
}>;

export type StockCountsQuery = {
  __typename: 'Queries';
  stockCounts: {
    __typename: 'StockCounts';
    expired: number;
    expiringSoon: number;
    expiringBetweenThresholds: number;
    expiringInNextThreeMonths: number;
  };
};

export type ItemCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  lowStockThreshold: Types.Scalars['Int']['input'];
}>;

export type ItemCountsQuery = {
  __typename: 'Queries';
  itemCounts: {
    __typename: 'ItemCounts';
    itemCounts: {
      __typename: 'ItemCountsResponse';
      lowStock: number;
      noStock: number;
      moreThanSixMonthsStock: number;
      total: number;
      outOfStockProducts: number;
      productsAtRiskOfBeingOutOfStock: number;
      productsOverstocked: number;
    };
  };
};

export type RequisitionCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;

export type RequisitionCountsQuery = {
  __typename: 'Queries';
  requisitionCounts: {
    __typename: 'RequisitionCounts';
    request: { __typename: 'RequestRequisitionCounts'; draft: number };
    response: { __typename: 'ResponseRequisitionCounts'; new: number };
    emergency: {
      __typename: 'EmergencyResponseRequisitionCounts';
      new: number;
    };
  };
};

export type OutboundShipmentCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  timezoneOffset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
}>;

export type OutboundShipmentCountsQuery = {
  __typename: 'Queries';
  invoiceCounts: {
    __typename: 'InvoiceCounts';
    outbound: {
      __typename: 'OutboundInvoiceCounts';
      notShipped: number;
      created: {
        __typename: 'InvoiceCountsSummary';
        today: number;
        thisWeek: number;
      };
    };
  };
};

export type InboundShipmentCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  timezoneOffset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
}>;

export type InboundShipmentCountsQuery = {
  __typename: 'Queries';
  invoiceCounts: {
    __typename: 'InvoiceCounts';
    inbound: {
      __typename: 'InboundInvoiceCounts';
      notDelivered: number;
      created: {
        __typename: 'InvoiceCountsSummary';
        today: number;
        thisWeek: number;
      };
    };
  };
};

export const StockCountsDocument = gql`
  query stockCounts(
    $storeId: String!
    $daysTillExpired: Int
    $timezoneOffset: Int
  ) {
    stockCounts(
      storeId: $storeId
      daysTillExpired: $daysTillExpired
      timezoneOffset: $timezoneOffset
    ) {
      expired
      expiringSoon
      expiringBetweenThresholds
      expiringInNextThreeMonths
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
        outOfStockProducts
        productsAtRiskOfBeingOutOfStock
        productsOverstocked
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
      emergency {
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

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string,
  variables?: any
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (
  action,
  _operationName,
  _operationType,
  _variables
) => action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper
) {
  return {
    stockCounts(
      variables: StockCountsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<StockCountsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<StockCountsQuery>({
            document: StockCountsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'stockCounts',
        'query',
        variables
      );
    },
    itemCounts(
      variables: ItemCountsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<ItemCountsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ItemCountsQuery>({
            document: ItemCountsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'itemCounts',
        'query',
        variables
      );
    },
    requisitionCounts(
      variables: RequisitionCountsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<RequisitionCountsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<RequisitionCountsQuery>({
            document: RequisitionCountsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'requisitionCounts',
        'query',
        variables
      );
    },
    outboundShipmentCounts(
      variables: OutboundShipmentCountsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<OutboundShipmentCountsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<OutboundShipmentCountsQuery>({
            document: OutboundShipmentCountsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'outboundShipmentCounts',
        'query',
        variables
      );
    },
    inboundShipmentCounts(
      variables: InboundShipmentCountsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<InboundShipmentCountsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InboundShipmentCountsQuery>({
            document: InboundShipmentCountsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'inboundShipmentCounts',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
