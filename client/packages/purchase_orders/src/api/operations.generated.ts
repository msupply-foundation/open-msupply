import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type PurchaseOrderRowFragment = {
  __typename: 'PurchaseOrderNode';
  id: string;
  number: number;
  createdDatetime: string;
  confirmedDatetime?: string | null;
  status: Types.PurchaseOrderNodeStatus;
  targetMonths?: number | null;
  expectedDeliveryDatetime?: string | null;
  comment?: string | null;
  supplier?: { __typename: 'NameNode'; id: string; name: string } | null;
  lines: { __typename: 'PurchaseOrderLineConnector'; totalCount: number };
};

export type PurchaseOrderFragment = {
  __typename: 'PurchaseOrderNode';
  id: string;
  number: number;
  additionalInstructions?: string | null;
  agentCommission?: number | null;
  authorisingOfficer1?: string | null;
  authorisingOfficer2?: string | null;
  comment?: string | null;
  communicationsCharge?: number | null;
  createdDatetime: string;
  currencyId?: string | null;
  documentCharge?: number | null;
  foreignExchangeRate?: number | null;
  freightCharge?: number | null;
  freightConditions?: string | null;
  headingMessage?: string | null;
  insuranceCharge?: number | null;
  reference?: string | null;
  sentDate?: string | null;
  shippingMethod?: string | null;
  status: Types.PurchaseOrderNodeStatus;
  supplierAgent?: string | null;
  supplierDiscountAmount: number;
  targetMonths?: number | null;
  donor?: { __typename: 'NameNode'; id: string; name: string } | null;
  lines: {
    __typename: 'PurchaseOrderLineConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'PurchaseOrderLineNode';
      id: string;
      expectedDeliveryDate?: string | null;
      requestedPackSize: number;
      requestedDeliveryDate?: string | null;
      item: {
        __typename: 'ItemNode';
        id: string;
        code: string;
        name: string;
        unitName?: string | null;
      };
    }>;
  };
  store?: { __typename: 'StoreNode'; id: string } | null;
  supplier?: { __typename: 'NameNode'; id: string; name: string } | null;
};

export type PurchaseOrderLineFragment = {
  __typename: 'PurchaseOrderLineNode';
  id: string;
  expectedDeliveryDate?: string | null;
  requestedPackSize: number;
  requestedDeliveryDate?: string | null;
  item: {
    __typename: 'ItemNode';
    id: string;
    code: string;
    name: string;
    unitName?: string | null;
  };
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
      number: number;
      createdDatetime: string;
      confirmedDatetime?: string | null;
      status: Types.PurchaseOrderNodeStatus;
      targetMonths?: number | null;
      expectedDeliveryDatetime?: string | null;
      comment?: string | null;
      supplier?: { __typename: 'NameNode'; id: string; name: string } | null;
      lines: { __typename: 'PurchaseOrderLineConnector'; totalCount: number };
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
        number: number;
        additionalInstructions?: string | null;
        agentCommission?: number | null;
        authorisingOfficer1?: string | null;
        authorisingOfficer2?: string | null;
        comment?: string | null;
        communicationsCharge?: number | null;
        createdDatetime: string;
        currencyId?: string | null;
        documentCharge?: number | null;
        foreignExchangeRate?: number | null;
        freightCharge?: number | null;
        freightConditions?: string | null;
        headingMessage?: string | null;
        insuranceCharge?: number | null;
        reference?: string | null;
        sentDate?: string | null;
        shippingMethod?: string | null;
        status: Types.PurchaseOrderNodeStatus;
        supplierAgent?: string | null;
        supplierDiscountAmount: number;
        targetMonths?: number | null;
        donor?: { __typename: 'NameNode'; id: string; name: string } | null;
        lines: {
          __typename: 'PurchaseOrderLineConnector';
          totalCount: number;
          nodes: Array<{
            __typename: 'PurchaseOrderLineNode';
            id: string;
            expectedDeliveryDate?: string | null;
            requestedPackSize: number;
            requestedDeliveryDate?: string | null;
            item: {
              __typename: 'ItemNode';
              id: string;
              code: string;
              name: string;
              unitName?: string | null;
            };
          }>;
        };
        store?: { __typename: 'StoreNode'; id: string } | null;
        supplier?: { __typename: 'NameNode'; id: string; name: string } | null;
      }
    | { __typename: 'RecordNotFound'; description: string };
};

export type InsertPurchaseOrderMutationVariables = Types.Exact<{
  input: Types.InsertPurchaseOrderInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type InsertPurchaseOrderMutation = {
  __typename: 'Mutations';
  insertPurchaseOrder: { __typename: 'IdResponse'; id: string };
};

export type UpdatePurchaseOrderMutationVariables = Types.Exact<{
  input: Types.UpdatePurchaseOrderInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type UpdatePurchaseOrderMutation = {
  __typename: 'Mutations';
  updatePurchaseOrder: { __typename: 'IdResponse'; id: string };
};

export const PurchaseOrderRowFragmentDoc = gql`
  fragment PurchaseOrderRow on PurchaseOrderNode {
    id
    number
    supplier {
      __typename
      id
      name
    }
    createdDatetime
    confirmedDatetime
    status
    targetMonths
    expectedDeliveryDatetime
    lines {
      totalCount
    }
    comment
  }
`;
export const PurchaseOrderLineFragmentDoc = gql`
  fragment PurchaseOrderLine on PurchaseOrderLineNode {
    __typename
    id
    expectedDeliveryDate
    item {
      id
      code
      name
      unitName
    }
    requestedPackSize
    requestedDeliveryDate
  }
`;
export const PurchaseOrderFragmentDoc = gql`
  fragment PurchaseOrder on PurchaseOrderNode {
    __typename
    id
    number
    additionalInstructions
    agentCommission
    authorisingOfficer1
    authorisingOfficer2
    comment
    communicationsCharge
    createdDatetime
    currencyId
    documentCharge
    donor {
      id
      name
    }
    foreignExchangeRate
    freightCharge
    freightConditions
    headingMessage
    insuranceCharge
    reference
    lines {
      __typename
      nodes {
        ...PurchaseOrderLine
      }
      totalCount
    }
    sentDate
    shippingMethod
    status
    store {
      id
    }
    supplier {
      __typename
      id
      name
    }
    supplierAgent
    supplierDiscountAmount
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
          ...PurchaseOrderRow
        }
        totalCount
      }
    }
  }
  ${PurchaseOrderRowFragmentDoc}
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
export const InsertPurchaseOrderDocument = gql`
  mutation insertPurchaseOrder(
    $input: InsertPurchaseOrderInput!
    $storeId: String!
  ) {
    insertPurchaseOrder(input: $input, storeId: $storeId) {
      ... on IdResponse {
        id
      }
    }
  }
`;
export const UpdatePurchaseOrderDocument = gql`
  mutation updatePurchaseOrder(
    $input: UpdatePurchaseOrderInput!
    $storeId: String!
  ) {
    updatePurchaseOrder(input: $input, storeId: $storeId) {
      ... on IdResponse {
        id
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
    insertPurchaseOrder(
      variables: InsertPurchaseOrderMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InsertPurchaseOrderMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertPurchaseOrderMutation>(
            InsertPurchaseOrderDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertPurchaseOrder',
        'mutation',
        variables
      );
    },
    updatePurchaseOrder(
      variables: UpdatePurchaseOrderMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<UpdatePurchaseOrderMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdatePurchaseOrderMutation>(
            UpdatePurchaseOrderDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'updatePurchaseOrder',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
