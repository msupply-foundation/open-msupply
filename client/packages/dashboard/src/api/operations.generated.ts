import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type ItemCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  lowStockThreshold: Types.Scalars['Float']['input'];
  highStockThreshold: Types.Scalars['Float']['input'];
}>;

export type ItemCountsQuery = {
  __typename: 'Queries';
  itemCounts: {
    __typename: 'ItemCounts';
    itemCounts: {
      __typename: 'ItemCountsResponse';
      lowStock: number;
      noStock: number;
      highStock: number;
      total: number;
      outOfStockProducts: number;
      productsAtRiskOfBeingOutOfStock: number;
      productsOverstocked: number;
    };
  };
};

export type InboundInternalCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;

export type InboundInternalCountsQuery = {
  __typename: 'Queries';
  inboundShipmentCounts: {
    __typename: 'InboundInvoiceCounts';
    notDelivered: number;
    created: {
      __typename: 'InvoiceCountsSummary';
      today: number;
      thisWeek: number;
    };
  };
};

export type InboundExternalCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;

export type InboundExternalCountsQuery = {
  __typename: 'Queries';
  inboundShipmentExternalCounts: {
    __typename: 'InboundInvoiceCounts';
    notDelivered: number;
    created: {
      __typename: 'InvoiceCountsSummary';
      today: number;
      thisWeek: number;
    };
  };
};

export type OutboundCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;

export type OutboundCountsQuery = {
  __typename: 'Queries';
  outboundShipmentCounts: {
    __typename: 'OutboundInvoiceCounts';
    notShipped: number;
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
  query itemCounts(
    $storeId: String!
    $lowStockThreshold: Float!
    $highStockThreshold: Float!
  ) {
    itemCounts(
      lowStockThreshold: $lowStockThreshold
      highStockThreshold: $highStockThreshold
      storeId: $storeId
    ) {
      itemCounts {
        lowStock
        noStock
        highStock
        total
        outOfStockProducts
        productsAtRiskOfBeingOutOfStock
        productsOverstocked
      }
    }
  }
`;
export const InboundInternalCountsDocument = gql`
  query inboundInternalCounts($storeId: String!) {
    inboundShipmentCounts(storeId: $storeId) {
      created {
        today
        thisWeek
      }
      notDelivered
    }
  }
`;
export const InboundExternalCountsDocument = gql`
  query inboundExternalCounts($storeId: String!) {
    inboundShipmentExternalCounts(storeId: $storeId) {
      created {
        today
        thisWeek
      }
      notDelivered
    }
  }
`;
export const OutboundCountsDocument = gql`
  query outboundCounts($storeId: String!) {
    outboundShipmentCounts(storeId: $storeId) {
      notShipped
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
    inboundInternalCounts(
      variables: InboundInternalCountsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<InboundInternalCountsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InboundInternalCountsQuery>({
            document: InboundInternalCountsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'inboundInternalCounts',
        'query',
        variables
      );
    },
    inboundExternalCounts(
      variables: InboundExternalCountsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<InboundExternalCountsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InboundExternalCountsQuery>({
            document: InboundExternalCountsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'inboundExternalCounts',
        'query',
        variables
      );
    },
    outboundCounts(
      variables: OutboundCountsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<OutboundCountsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<OutboundCountsQuery>({
            document: OutboundCountsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'outboundCounts',
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
