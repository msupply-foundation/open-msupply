import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type PurchaseOrderFragment = {
  __typename: 'PurchaseOrderNode';
  id: string;
  additionalInstructions?: string | null;
  advancePaidDatetime?: string | null;
  agentCommission?: number | null;
  authorisingOfficer1?: string | null;
  authorisingOfficer2?: string | null;
  comment?: string | null;
  communicationsCharge?: number | null;
  contractSignedDatetime?: string | null;
  createdDatetime: string;
  currencyId?: string | null;
  deliveryDatetime?: string | null;
  documentCharge?: number | null;
  donorLinkId?: string | null;
  foreignExchangeRate?: number | null;
  expectedDeliveryDatetime?: string | null;
  freightCharge?: number | null;
  freightConditions?: string | null;
  headingMessage?: string | null;
  insuranceCharge?: number | null;
  receivedAtPortDatetime?: string | null;
  reference: string;
  sentDatetime?: string | null;
  shippingMethod?: string | null;
  status?: string | null;
  storeId: string;
  supplierAgent?: string | null;
  supplierDiscountAmount?: number | null;
  supplierDiscountPercentage?: number | null;
  supplierId?: string | null;
  targetMonths?: number | null;
  lines: {
    __typename: 'PurchaseOrderLineConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'PurchaseOrderLineNode';
      id: string;
      adjustedQuantity?: number | null;
      expectedDeliveryDate?: string | null;
      itemCode: string;
      itemName?: string | null;
      numberOfPacks?: number | null;
      originalQuantity?: number | null;
      packSize?: number | null;
      requestedDeliveryDate?: string | null;
      totalReceived?: number | null;
    }>;
  };
};

export type PurchaseOrderLineFragment = {
  __typename: 'PurchaseOrderLineNode';
  id: string;
  adjustedQuantity?: number | null;
  expectedDeliveryDate?: string | null;
  itemCode: string;
  itemName?: string | null;
  numberOfPacks?: number | null;
  originalQuantity?: number | null;
  packSize?: number | null;
  requestedDeliveryDate?: string | null;
  totalReceived?: number | null;
};

export type PurchaseOrdersQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.PurchaseOrderSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.PurchaseOrderFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;

export type PurchaseOrdersQuery = {
  __typename: 'Queries';
  purchaseOrders: {
    __typename: 'PurchaseOrderConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'PurchaseOrderNode';
      id: string;
      additionalInstructions?: string | null;
      advancePaidDatetime?: string | null;
      agentCommission?: number | null;
      authorisingOfficer1?: string | null;
      authorisingOfficer2?: string | null;
      comment?: string | null;
      communicationsCharge?: number | null;
      contractSignedDatetime?: string | null;
      createdDatetime: string;
      currencyId?: string | null;
      deliveryDatetime?: string | null;
      documentCharge?: number | null;
      donorLinkId?: string | null;
      foreignExchangeRate?: number | null;
      expectedDeliveryDatetime?: string | null;
      freightCharge?: number | null;
      freightConditions?: string | null;
      headingMessage?: string | null;
      insuranceCharge?: number | null;
      receivedAtPortDatetime?: string | null;
      reference: string;
      sentDatetime?: string | null;
      shippingMethod?: string | null;
      status?: string | null;
      storeId: string;
      supplierAgent?: string | null;
      supplierDiscountAmount?: number | null;
      supplierDiscountPercentage?: number | null;
      supplierId?: string | null;
      targetMonths?: number | null;
      lines: {
        __typename: 'PurchaseOrderLineConnector';
        totalCount: number;
        nodes: Array<{
          __typename: 'PurchaseOrderLineNode';
          id: string;
          adjustedQuantity?: number | null;
          expectedDeliveryDate?: string | null;
          itemCode: string;
          itemName?: string | null;
          numberOfPacks?: number | null;
          originalQuantity?: number | null;
          packSize?: number | null;
          requestedDeliveryDate?: string | null;
          totalReceived?: number | null;
        }>;
      };
    }>;
  };
};

export type PurchaseOrderByIdQueryVariables = Types.Exact<{
  purchaseOrderId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type PurchaseOrderByIdQuery = {
  __typename: 'Queries';
  purchaseOrder:
    | {
        __typename: 'PurchaseOrderNode';
        id: string;
        additionalInstructions?: string | null;
        advancePaidDatetime?: string | null;
        agentCommission?: number | null;
        authorisingOfficer1?: string | null;
        authorisingOfficer2?: string | null;
        comment?: string | null;
        communicationsCharge?: number | null;
        contractSignedDatetime?: string | null;
        createdDatetime: string;
        currencyId?: string | null;
        deliveryDatetime?: string | null;
        documentCharge?: number | null;
        donorLinkId?: string | null;
        foreignExchangeRate?: number | null;
        expectedDeliveryDatetime?: string | null;
        freightCharge?: number | null;
        freightConditions?: string | null;
        headingMessage?: string | null;
        insuranceCharge?: number | null;
        receivedAtPortDatetime?: string | null;
        reference: string;
        sentDatetime?: string | null;
        shippingMethod?: string | null;
        status?: string | null;
        storeId: string;
        supplierAgent?: string | null;
        supplierDiscountAmount?: number | null;
        supplierDiscountPercentage?: number | null;
        supplierId?: string | null;
        targetMonths?: number | null;
        lines: {
          __typename: 'PurchaseOrderLineConnector';
          totalCount: number;
          nodes: Array<{
            __typename: 'PurchaseOrderLineNode';
            id: string;
            adjustedQuantity?: number | null;
            expectedDeliveryDate?: string | null;
            itemCode: string;
            itemName?: string | null;
            numberOfPacks?: number | null;
            originalQuantity?: number | null;
            packSize?: number | null;
            requestedDeliveryDate?: string | null;
            totalReceived?: number | null;
          }>;
        };
      }
    | { __typename: 'RecordNotFound'; description: string };
};

export const PurchaseOrderLineFragmentDoc = gql`
  fragment PurchaseOrderLine on PurchaseOrderLineNode {
    __typename
    id
    adjustedQuantity
    expectedDeliveryDate
    itemCode
    itemName
    numberOfPacks
    originalQuantity
    packSize
    requestedDeliveryDate
    totalReceived
  }
`;
export const PurchaseOrderFragmentDoc = gql`
  fragment PurchaseOrder on PurchaseOrderNode {
    __typename
    id
    additionalInstructions
    advancePaidDatetime
    agentCommission
    authorisingOfficer1
    authorisingOfficer2
    comment
    communicationsCharge
    contractSignedDatetime
    createdDatetime
    currencyId
    deliveryDatetime
    documentCharge
    donorLinkId
    foreignExchangeRate
    expectedDeliveryDatetime
    freightCharge
    freightConditions
    headingMessage
    insuranceCharge
    receivedAtPortDatetime
    reference
    lines {
      __typename
      nodes {
        ...PurchaseOrderLine
      }
      totalCount
    }
    sentDatetime
    shippingMethod
    status
    storeId
    supplierAgent
    supplierDiscountAmount
    supplierDiscountPercentage
    supplierId
    targetMonths
  }
  ${PurchaseOrderLineFragmentDoc}
`;
export const PurchaseOrdersDocument = gql`
  query purchaseOrders(
    $first: Int
    $offset: Int
    $key: PurchaseOrderSortFieldInput!
    $desc: Boolean
    $filter: PurchaseOrderFilterInput
    $storeId: String!
  ) {
    purchaseOrders(
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
      filter: $filter
      storeId: $storeId
    ) {
      ... on PurchaseOrderConnector {
        __typename
        nodes {
          ...PurchaseOrder
        }
        totalCount
      }
    }
  }
  ${PurchaseOrderFragmentDoc}
`;
export const PurchaseOrderByIdDocument = gql`
  query purchaseOrderById($purchaseOrderId: String!, $storeId: String!) {
    purchaseOrder(id: $purchaseOrderId, storeId: $storeId) {
      __typename
      ... on RecordNotFound {
        __typename
        description
      }
      ... on PurchaseOrderNode {
        ...PurchaseOrder
      }
    }
  }
  ${PurchaseOrderFragmentDoc}
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
    purchaseOrders(
      variables: PurchaseOrdersQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<PurchaseOrdersQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PurchaseOrdersQuery>(
            PurchaseOrdersDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'purchaseOrders',
        'query',
        variables
      );
    },
    purchaseOrderById(
      variables: PurchaseOrderByIdQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<PurchaseOrderByIdQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PurchaseOrderByIdQuery>(
            PurchaseOrderByIdDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'purchaseOrderById',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
