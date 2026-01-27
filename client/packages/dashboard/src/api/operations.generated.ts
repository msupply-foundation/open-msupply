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

export type InboundCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;

export type InboundCountsQuery = {
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

export type OutboundCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;

export type OutboundCountsQuery = {
  __typename: 'Queries';
  invoiceCounts: {
    __typename: 'InvoiceCounts';
    outbound: { __typename: 'OutboundInvoiceCounts'; notShipped: number };
  };
};

export type InternalOrderCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;

export type InternalOrderCountsQuery = {
  __typename: 'Queries';
  requisitionCounts: {
    __typename: 'RequisitionCounts';
    request: { __typename: 'RequestRequisitionCounts'; draft: number };
  };
};

export type RequisitionCountsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;

export type RequisitionCountsQuery = {
  __typename: 'Queries';
  requisitionCounts: {
    __typename: 'RequisitionCounts';
    response: { __typename: 'ResponseRequisitionCounts'; new: number };
    emergency: {
      __typename: 'EmergencyResponseRequisitionCounts';
      new: number;
    };
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
export const InboundCountsDocument = gql`
  query inboundCounts($storeId: String!) {
    invoiceCounts(storeId: $storeId) {
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
export const OutboundCountsDocument = gql`
  query outboundCounts($storeId: String!) {
    invoiceCounts(storeId: $storeId) {
      outbound {
        notShipped
      }
    }
  }
`;
export const InternalOrderCountsDocument = gql`
  query internalOrderCounts($storeId: String!) {
    requisitionCounts(storeId: $storeId) {
      request {
        draft
      }
    }
  }
`;
export const RequisitionCountsDocument = gql`
  query requisitionCounts($storeId: String!) {
    requisitionCounts(storeId: $storeId) {
      response {
        new
      }
      emergency {
        new
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
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<ItemCountsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ItemCountsQuery>(ItemCountsDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'itemCounts',
        'query',
        variables
      );
    },
    inboundCounts(
      variables: InboundCountsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InboundCountsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InboundCountsQuery>(InboundCountsDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'inboundCounts',
        'query',
        variables
      );
    },
    outboundCounts(
      variables: OutboundCountsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<OutboundCountsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<OutboundCountsQuery>(
            OutboundCountsDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'outboundCounts',
        'query',
        variables
      );
    },
    internalOrderCounts(
      variables: InternalOrderCountsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InternalOrderCountsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InternalOrderCountsQuery>(
            InternalOrderCountsDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'internalOrderCounts',
        'query',
        variables
      );
    },
    requisitionCounts(
      variables: RequisitionCountsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<RequisitionCountsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<RequisitionCountsQuery>(
            RequisitionCountsDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'requisitionCounts',
        'query',
        variables
      );
    },
    stockCounts(
      variables: StockCountsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<StockCountsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<StockCountsQuery>(StockCountsDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'stockCounts',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
