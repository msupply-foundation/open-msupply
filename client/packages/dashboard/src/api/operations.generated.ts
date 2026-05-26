import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
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

export type DashboardInvoiceCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;

export type DashboardInvoiceCountsQuery = {
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
    outbound: { __typename: 'OutboundInvoiceCounts'; notShipped: number };
  };
};

export type DashboardRequisitionCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;

export type DashboardRequisitionCountsQuery = {
  __typename: 'Queries';
  requisitionCounts: {
    __typename: 'RequisitionCounts';
    response: { __typename: 'ResponseRequisitionCounts'; new: number };
    emergency: {
      __typename: 'EmergencyResponseRequisitionCounts';
      new: number;
    };
    request: { __typename: 'RequestRequisitionCounts'; draft: number };
  };
};

export type StockCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  daysTillExpired?: Types.InputMaybe<Types.Scalars['Int']['input']>;
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
export const DashboardInvoiceCountsDocument = gql`
  query dashboardInvoiceCounts($storeId: String!) {
    invoiceCounts(storeId: $storeId) {
      inbound {
        created {
          today
          thisWeek
        }
        notDelivered
      }
      outbound {
        notShipped
      }
    }
  }
`;
export const DashboardRequisitionCountsDocument = gql`
  query dashboardRequisitionCounts($storeId: String!) {
    requisitionCounts(storeId: $storeId) {
      response {
        new
      }
      emergency {
        new
      }
      request {
        draft
      }
    }
  }
`;
export const StockCountsDocument = gql`
  query stockCounts($storeId: String!, $daysTillExpired: Int) {
    stockCounts(storeId: $storeId, daysTillExpired: $daysTillExpired) {
      expired
      expiringSoon
      expiringBetweenThresholds
      expiringInNextThreeMonths
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
    dashboardInvoiceCounts(
      variables: DashboardInvoiceCountsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<DashboardInvoiceCountsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DashboardInvoiceCountsQuery>({
            document: DashboardInvoiceCountsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'dashboardInvoiceCounts',
        'query',
        variables
      );
    },
    dashboardRequisitionCounts(
      variables: DashboardRequisitionCountsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<DashboardRequisitionCountsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DashboardRequisitionCountsQuery>({
            document: DashboardRequisitionCountsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'dashboardRequisitionCounts',
        'query',
        variables
      );
    },
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
  };
}
export type Sdk = ReturnType<typeof getSdk>;
