import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
import { SyncFileReferenceFragmentDoc } from '../../../../system/src/Documents/types.generated';
import { NameRowFragmentDoc } from '../../../../system/src/Name/api/operations.generated';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type PurchaseOrderRowFragment = {
  __typename: 'PurchaseOrderNode';
  id: string;
  number: number;
  createdDatetime: string;
  confirmedDatetime?: string | null;
  sentDatetime?: string | null;
  status: Types.PurchaseOrderNodeStatus;
  requestedDeliveryDate?: string | null;
  targetMonths?: number | null;
  reference?: string | null;
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
  sentDatetime?: string | null;
  shippingMethod?: string | null;
  status: Types.PurchaseOrderNodeStatus;
  supplierAgent?: string | null;
  supplierDiscountAmount: number;
  supplierDiscountPercentage?: number | null;
  orderTotalBeforeDiscount: number;
  orderTotalAfterDiscount: number;
  targetMonths?: number | null;
  confirmedDatetime?: string | null;
  contractSignedDate?: string | null;
  advancePaidDate?: string | null;
  receivedAtPortDate?: string | null;
  requestedDeliveryDate?: string | null;
  requestApprovalDatetime?: string | null;
  finalisedDatetime?: string | null;
  donor?: { __typename: 'NameNode'; id: string; name: string } | null;
  lines: {
    __typename: 'PurchaseOrderLineConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'PurchaseOrderLineNode';
      id: string;
      expectedDeliveryDate?: string | null;
      purchaseOrderId: string;
      lineNumber: number;
      requestedPackSize: number;
      requestedDeliveryDate?: string | null;
      requestedNumberOfUnits: number;
      receivedNumberOfUnits: number;
      adjustedNumberOfUnits?: number | null;
      pricePerPackAfterDiscount: number;
      pricePerPackBeforeDiscount: number;
      note?: string | null;
      unit?: string | null;
      comment?: string | null;
      supplierItemCode?: string | null;
      status: Types.PurchaseOrderLineStatusNode;
      unitsOrderedInOthers: number;
      item: {
        __typename: 'ItemNode';
        id: string;
        code: string;
        name: string;
        unitName?: string | null;
        stats: { __typename: 'ItemStatsNode'; stockOnHand: number };
      };
      manufacturer?: {
        __typename: 'NameNode';
        code: string;
        id: string;
        isCustomer: boolean;
        isSupplier: boolean;
        isOnHold: boolean;
        name: string;
        store?: { __typename: 'StoreNode'; id: string; code: string } | null;
      } | null;
      purchaseOrder?: {
        __typename: 'PurchaseOrderNode';
        id: string;
        number: number;
        reference?: string | null;
        confirmedDatetime?: string | null;
        currencyId?: string | null;
        supplier?: {
          __typename: 'NameNode';
          code: string;
          name: string;
        } | null;
        user?: { __typename: 'UserNode'; username: string } | null;
        currency?: {
          __typename: 'CurrencyNode';
          id: string;
          code: string;
          rate: number;
          isHomeCurrency: boolean;
        } | null;
      } | null;
    }>;
  };
  supplier?: { __typename: 'NameNode'; id: string; name: string } | null;
  documents: {
    __typename: 'SyncFileReferenceConnector';
    nodes: Array<{
      __typename: 'SyncFileReferenceNode';
      id: string;
      fileName: string;
      recordId: string;
      createdDatetime: string;
    }>;
  };
  currency?: {
    __typename: 'CurrencyNode';
    id: string;
    code: string;
    rate: number;
    isHomeCurrency: boolean;
  } | null;
};

export type PurchaseOrderLineFragment = {
  __typename: 'PurchaseOrderLineNode';
  id: string;
  expectedDeliveryDate?: string | null;
  purchaseOrderId: string;
  lineNumber: number;
  requestedPackSize: number;
  requestedDeliveryDate?: string | null;
  requestedNumberOfUnits: number;
  receivedNumberOfUnits: number;
  adjustedNumberOfUnits?: number | null;
  pricePerPackAfterDiscount: number;
  pricePerPackBeforeDiscount: number;
  note?: string | null;
  unit?: string | null;
  comment?: string | null;
  supplierItemCode?: string | null;
  status: Types.PurchaseOrderLineStatusNode;
  unitsOrderedInOthers: number;
  item: {
    __typename: 'ItemNode';
    id: string;
    code: string;
    name: string;
    unitName?: string | null;
    stats: { __typename: 'ItemStatsNode'; stockOnHand: number };
  };
  manufacturer?: {
    __typename: 'NameNode';
    code: string;
    id: string;
    isCustomer: boolean;
    isSupplier: boolean;
    isOnHold: boolean;
    name: string;
    store?: { __typename: 'StoreNode'; id: string; code: string } | null;
  } | null;
  purchaseOrder?: {
    __typename: 'PurchaseOrderNode';
    id: string;
    number: number;
    reference?: string | null;
    confirmedDatetime?: string | null;
    currencyId?: string | null;
    supplier?: { __typename: 'NameNode'; code: string; name: string } | null;
    user?: { __typename: 'UserNode'; username: string } | null;
    currency?: {
      __typename: 'CurrencyNode';
      id: string;
      code: string;
      rate: number;
      isHomeCurrency: boolean;
    } | null;
  } | null;
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
      sentDatetime?: string | null;
      status: Types.PurchaseOrderNodeStatus;
      requestedDeliveryDate?: string | null;
      targetMonths?: number | null;
      reference?: string | null;
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
        sentDatetime?: string | null;
        shippingMethod?: string | null;
        status: Types.PurchaseOrderNodeStatus;
        supplierAgent?: string | null;
        supplierDiscountAmount: number;
        supplierDiscountPercentage?: number | null;
        orderTotalBeforeDiscount: number;
        orderTotalAfterDiscount: number;
        targetMonths?: number | null;
        confirmedDatetime?: string | null;
        contractSignedDate?: string | null;
        advancePaidDate?: string | null;
        receivedAtPortDate?: string | null;
        requestedDeliveryDate?: string | null;
        requestApprovalDatetime?: string | null;
        finalisedDatetime?: string | null;
        donor?: { __typename: 'NameNode'; id: string; name: string } | null;
        lines: {
          __typename: 'PurchaseOrderLineConnector';
          totalCount: number;
          nodes: Array<{
            __typename: 'PurchaseOrderLineNode';
            id: string;
            expectedDeliveryDate?: string | null;
            purchaseOrderId: string;
            lineNumber: number;
            requestedPackSize: number;
            requestedDeliveryDate?: string | null;
            requestedNumberOfUnits: number;
            receivedNumberOfUnits: number;
            adjustedNumberOfUnits?: number | null;
            pricePerPackAfterDiscount: number;
            pricePerPackBeforeDiscount: number;
            note?: string | null;
            unit?: string | null;
            comment?: string | null;
            supplierItemCode?: string | null;
            status: Types.PurchaseOrderLineStatusNode;
            unitsOrderedInOthers: number;
            item: {
              __typename: 'ItemNode';
              id: string;
              code: string;
              name: string;
              unitName?: string | null;
              stats: { __typename: 'ItemStatsNode'; stockOnHand: number };
            };
            manufacturer?: {
              __typename: 'NameNode';
              code: string;
              id: string;
              isCustomer: boolean;
              isSupplier: boolean;
              isOnHold: boolean;
              name: string;
              store?: {
                __typename: 'StoreNode';
                id: string;
                code: string;
              } | null;
            } | null;
            purchaseOrder?: {
              __typename: 'PurchaseOrderNode';
              id: string;
              number: number;
              reference?: string | null;
              confirmedDatetime?: string | null;
              currencyId?: string | null;
              supplier?: {
                __typename: 'NameNode';
                code: string;
                name: string;
              } | null;
              user?: { __typename: 'UserNode'; username: string } | null;
              currency?: {
                __typename: 'CurrencyNode';
                id: string;
                code: string;
                rate: number;
                isHomeCurrency: boolean;
              } | null;
            } | null;
          }>;
        };
        supplier?: { __typename: 'NameNode'; id: string; name: string } | null;
        documents: {
          __typename: 'SyncFileReferenceConnector';
          nodes: Array<{
            __typename: 'SyncFileReferenceNode';
            id: string;
            fileName: string;
            recordId: string;
            createdDatetime: string;
          }>;
        };
        currency?: {
          __typename: 'CurrencyNode';
          id: string;
          code: string;
          rate: number;
          isHomeCurrency: boolean;
        } | null;
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

export type ItemCannotBeOrderedFragment = {
  __typename: 'ItemCannotBeOrdered';
  description: string;
  line: { __typename: 'PurchaseOrderLineNode'; id: string };
};

export type ItemsCannotBeOrderedFragment = {
  __typename: 'ItemsCannotBeOrdered';
  description: string;
  lines: Array<{
    __typename: 'ItemCannotBeOrdered';
    description: string;
    line: { __typename: 'PurchaseOrderLineNode'; id: string };
  }>;
};

export type UpdatePurchaseOrderMutationVariables = Types.Exact<{
  input: Types.UpdatePurchaseOrderInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type UpdatePurchaseOrderMutation = {
  __typename: 'Mutations';
  updatePurchaseOrder:
    | { __typename: 'IdResponse'; id: string }
    | {
        __typename: 'UpdatePurchaseOrderError';
        error: {
          __typename: 'ItemsCannotBeOrdered';
          description: string;
          lines: Array<{
            __typename: 'ItemCannotBeOrdered';
            description: string;
            line: { __typename: 'PurchaseOrderLineNode'; id: string };
          }>;
        };
      };
};

export type DeletePurchaseOrderMutationVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type DeletePurchaseOrderMutation = {
  __typename: 'Mutations';
  deletePurchaseOrder:
    | {
        __typename: 'DeletePurchaseOrderError';
        error:
          | { __typename: 'CannotDeletePurchaseOrder'; description: string }
          | { __typename: 'RecordNotFound'; description: string };
      }
    | { __typename: 'DeleteResponse'; id: string };
};

export type PurchaseOrderLinesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.PurchaseOrderLineSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.PurchaseOrderLineFilterInput>;
}>;

export type PurchaseOrderLinesQuery = {
  __typename: 'Queries';
  purchaseOrderLines: {
    __typename: 'PurchaseOrderLineConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'PurchaseOrderLineNode';
      id: string;
      expectedDeliveryDate?: string | null;
      purchaseOrderId: string;
      lineNumber: number;
      requestedPackSize: number;
      requestedDeliveryDate?: string | null;
      requestedNumberOfUnits: number;
      receivedNumberOfUnits: number;
      adjustedNumberOfUnits?: number | null;
      pricePerPackAfterDiscount: number;
      pricePerPackBeforeDiscount: number;
      note?: string | null;
      unit?: string | null;
      comment?: string | null;
      supplierItemCode?: string | null;
      status: Types.PurchaseOrderLineStatusNode;
      unitsOrderedInOthers: number;
      item: {
        __typename: 'ItemNode';
        id: string;
        code: string;
        name: string;
        unitName?: string | null;
        stats: { __typename: 'ItemStatsNode'; stockOnHand: number };
      };
      manufacturer?: {
        __typename: 'NameNode';
        code: string;
        id: string;
        isCustomer: boolean;
        isSupplier: boolean;
        isOnHold: boolean;
        name: string;
        store?: { __typename: 'StoreNode'; id: string; code: string } | null;
      } | null;
      purchaseOrder?: {
        __typename: 'PurchaseOrderNode';
        id: string;
        number: number;
        reference?: string | null;
        confirmedDatetime?: string | null;
        currencyId?: string | null;
        supplier?: {
          __typename: 'NameNode';
          code: string;
          name: string;
        } | null;
        user?: { __typename: 'UserNode'; username: string } | null;
        currency?: {
          __typename: 'CurrencyNode';
          id: string;
          code: string;
          rate: number;
          isHomeCurrency: boolean;
        } | null;
      } | null;
    }>;
  };
};

export type PurchaseOrderLineQueryVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type PurchaseOrderLineQuery = {
  __typename: 'Queries';
  purchaseOrderLines: {
    __typename: 'PurchaseOrderLineConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'PurchaseOrderLineNode';
      id: string;
      expectedDeliveryDate?: string | null;
      purchaseOrderId: string;
      lineNumber: number;
      requestedPackSize: number;
      requestedDeliveryDate?: string | null;
      requestedNumberOfUnits: number;
      receivedNumberOfUnits: number;
      adjustedNumberOfUnits?: number | null;
      pricePerPackAfterDiscount: number;
      pricePerPackBeforeDiscount: number;
      note?: string | null;
      unit?: string | null;
      comment?: string | null;
      supplierItemCode?: string | null;
      status: Types.PurchaseOrderLineStatusNode;
      unitsOrderedInOthers: number;
      item: {
        __typename: 'ItemNode';
        id: string;
        code: string;
        name: string;
        unitName?: string | null;
        stats: { __typename: 'ItemStatsNode'; stockOnHand: number };
      };
      manufacturer?: {
        __typename: 'NameNode';
        code: string;
        id: string;
        isCustomer: boolean;
        isSupplier: boolean;
        isOnHold: boolean;
        name: string;
        store?: { __typename: 'StoreNode'; id: string; code: string } | null;
      } | null;
      purchaseOrder?: {
        __typename: 'PurchaseOrderNode';
        id: string;
        number: number;
        reference?: string | null;
        confirmedDatetime?: string | null;
        currencyId?: string | null;
        supplier?: {
          __typename: 'NameNode';
          code: string;
          name: string;
        } | null;
        user?: { __typename: 'UserNode'; username: string } | null;
        currency?: {
          __typename: 'CurrencyNode';
          id: string;
          code: string;
          rate: number;
          isHomeCurrency: boolean;
        } | null;
      } | null;
    }>;
  };
};

export type PurchaseOrderLinesCountQueryVariables = Types.Exact<{
  filter?: Types.InputMaybe<Types.PurchaseOrderLineFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;

export type PurchaseOrderLinesCountQuery = {
  __typename: 'Queries';
  purchaseOrderLines: {
    __typename: 'PurchaseOrderLineConnector';
    totalCount: number;
  };
};

export type InsertPurchaseOrderLineMutationVariables = Types.Exact<{
  input: Types.InsertPurchaseOrderLineInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type InsertPurchaseOrderLineMutation = {
  __typename: 'Mutations';
  insertPurchaseOrderLine:
    | { __typename: 'IdResponse'; id: string }
    | {
        __typename: 'InsertPurchaseOrderLineError';
        error:
          | { __typename: 'CannnotFindItemByCode'; description: string }
          | { __typename: 'CannotEditPurchaseOrder'; description: string }
          | { __typename: 'ForeignKeyError'; description: string }
          | { __typename: 'PackSizeCodeCombinationExists'; description: string }
          | {
              __typename: 'PurchaseOrderLineWithIdExists';
              description: string;
            };
      };
};

export type AddToPurchaseOrderFromMasterListMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.AddToPurchaseOrderFromMasterListInput;
}>;

export type AddToPurchaseOrderFromMasterListMutation = {
  __typename: 'Mutations';
  addToPurchaseOrderFromMasterList:
    | {
        __typename: 'AddToPurchaseOrderFromMasterListError';
        error:
          | { __typename: 'CannotEditPurchaseOrder'; description: string }
          | {
              __typename: 'MasterListNotFoundForThisStore';
              description: string;
            }
          | { __typename: 'RecordNotFound'; description: string };
      }
    | { __typename: 'PurchaseOrderLineConnector' };
};

export type UpdatePurchaseOrderLineMutationVariables = Types.Exact<{
  input: Types.UpdatePurchaseOrderLineInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type UpdatePurchaseOrderLineMutation = {
  __typename: 'Mutations';
  updatePurchaseOrderLine:
    | { __typename: 'IdResponse'; id: string }
    | {
        __typename: 'UpdatePurchaseOrderLineError';
        error:
          | { __typename: 'CannotEditAdjustedQuantity'; description: string }
          | { __typename: 'CannotEditPurchaseOrder'; description: string }
          | {
              __typename: 'CannotEditQuantityBelowReceived';
              description: string;
            }
          | { __typename: 'CannotEditRequestedQuantity'; description: string }
          | {
              __typename: 'ItemCannotBeOrdered';
              description: string;
              line: { __typename: 'PurchaseOrderLineNode'; id: string };
            }
          | { __typename: 'PurchaseOrderDoesNotExist'; description: string }
          | { __typename: 'PurchaseOrderLineNotFound'; description: string }
          | { __typename: 'UpdatedLineDoesNotExist'; description: string };
      };
};

export type DeletePurchaseOrderLinesMutationVariables = Types.Exact<{
  ids:
    | Array<Types.Scalars['String']['input']>
    | Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type DeletePurchaseOrderLinesMutation = {
  __typename: 'Mutations';
  deletePurchaseOrderLines: Array<{
    __typename: 'DeletePurchaseOrderLineResponseWithId';
    id: string;
    response:
      | {
          __typename: 'DeletePurchaseOrderLineError';
          error: { __typename: 'RecordNotFound'; description: string };
        }
      | { __typename: 'DeleteResponse'; id: string };
  }>;
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
    sentDatetime
    status
    requestedDeliveryDate
    targetMonths
    reference
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
    purchaseOrderId
    lineNumber
    item {
      id
      code
      name
      unitName
      stats(storeId: $storeId) {
        stockOnHand
      }
    }
    requestedPackSize
    requestedDeliveryDate
    requestedNumberOfUnits
    receivedNumberOfUnits
    adjustedNumberOfUnits
    pricePerPackAfterDiscount
    pricePerPackBeforeDiscount
    manufacturer(storeId: $storeId) {
      ...NameRow
    }
    note
    unit
    comment
    supplierItemCode
    status
    purchaseOrder {
      id
      number
      reference
      confirmedDatetime
      supplier {
        code
        name
      }
      user {
        username
      }
      currencyId
      currency {
        id
        code
        rate
        isHomeCurrency
      }
    }
    unitsOrderedInOthers
  }
  ${NameRowFragmentDoc}
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
    sentDatetime
    shippingMethod
    status
    supplier {
      __typename
      id
      name
    }
    supplierAgent
    supplierDiscountAmount
    supplierDiscountPercentage
    orderTotalBeforeDiscount
    orderTotalAfterDiscount
    targetMonths
    confirmedDatetime
    contractSignedDate
    advancePaidDate
    receivedAtPortDate
    requestedDeliveryDate
    requestApprovalDatetime
    finalisedDatetime
    documents {
      __typename
      nodes {
        ...SyncFileReference
      }
    }
    donor {
      id
    }
    currency {
      id
      code
      rate
      isHomeCurrency
    }
  }
  ${PurchaseOrderLineFragmentDoc}
  ${SyncFileReferenceFragmentDoc}
`;
export const ItemCannotBeOrderedFragmentDoc = gql`
  fragment ItemCannotBeOrdered on ItemCannotBeOrdered {
    __typename
    description
    line {
      id
    }
  }
`;
export const ItemsCannotBeOrderedFragmentDoc = gql`
  fragment ItemsCannotBeOrdered on ItemsCannotBeOrdered {
    __typename
    description
    lines {
      ...ItemCannotBeOrdered
    }
  }
  ${ItemCannotBeOrderedFragmentDoc}
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
      ... on UpdatePurchaseOrderError {
        __typename
        error {
          ... on ItemsCannotBeOrdered {
            ...ItemsCannotBeOrdered
          }
        }
      }
    }
  }
  ${ItemsCannotBeOrderedFragmentDoc}
`;
export const DeletePurchaseOrderDocument = gql`
  mutation deletePurchaseOrder($id: String!, $storeId: String!) {
    deletePurchaseOrder(id: $id, storeId: $storeId) {
      ... on DeletePurchaseOrderError {
        __typename
        error {
          ... on RecordNotFound {
            __typename
          }
          description
          ... on CannotDeletePurchaseOrder {
            __typename
          }
        }
      }
      ... on DeleteResponse {
        id
      }
    }
  }
`;
export const PurchaseOrderLinesDocument = gql`
  query purchaseOrderLines(
    $storeId: String!
    $first: Int
    $offset: Int
    $key: PurchaseOrderLineSortFieldInput!
    $desc: Boolean
    $filter: PurchaseOrderLineFilterInput
  ) {
    purchaseOrderLines(
      storeId: $storeId
      filter: $filter
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
    ) {
      ... on PurchaseOrderLineConnector {
        __typename
        nodes {
          __typename
          ...PurchaseOrderLine
        }
        totalCount
      }
    }
  }
  ${PurchaseOrderLineFragmentDoc}
`;
export const PurchaseOrderLineDocument = gql`
  query purchaseOrderLine($id: String!, $storeId: String!) {
    purchaseOrderLines(storeId: $storeId, filter: { id: { equalTo: $id } }) {
      ... on PurchaseOrderLineConnector {
        __typename
        nodes {
          __typename
          ...PurchaseOrderLine
        }
        totalCount
      }
    }
  }
  ${PurchaseOrderLineFragmentDoc}
`;
export const PurchaseOrderLinesCountDocument = gql`
  query purchaseOrderLinesCount(
    $filter: PurchaseOrderLineFilterInput
    $storeId: String!
  ) {
    purchaseOrderLines(storeId: $storeId, filter: $filter) {
      ... on PurchaseOrderLineConnector {
        __typename
        totalCount
      }
    }
  }
`;
export const InsertPurchaseOrderLineDocument = gql`
  mutation insertPurchaseOrderLine(
    $input: InsertPurchaseOrderLineInput!
    $storeId: String!
  ) {
    insertPurchaseOrderLine(input: $input, storeId: $storeId) {
      ... on IdResponse {
        id
      }
      ... on InsertPurchaseOrderLineError {
        __typename
        error {
          description
          ... on CannnotFindItemByCode {
            __typename
            description
          }
          ... on CannotEditPurchaseOrder {
            __typename
            description
          }
          ... on ForeignKeyError {
            __typename
            description
          }
          ... on PackSizeCodeCombinationExists {
            __typename
            description
          }
          ... on PurchaseOrderLineWithIdExists {
            __typename
            description
          }
        }
      }
    }
  }
`;
export const AddToPurchaseOrderFromMasterListDocument = gql`
  mutation addToPurchaseOrderFromMasterList(
    $storeId: String!
    $input: AddToPurchaseOrderFromMasterListInput!
  ) {
    addToPurchaseOrderFromMasterList(storeId: $storeId, input: $input) {
      ... on AddToPurchaseOrderFromMasterListResponse {
        ... on PurchaseOrderLineConnector {
          __typename
          totalCount
        }
      }
      ... on AddToPurchaseOrderFromMasterListError {
        __typename
        error {
          ... on CannotEditPurchaseOrder {
            __typename
            description
          }
          ... on MasterListNotFoundForThisStore {
            __typename
            description
          }
          ... on RecordNotFound {
            __typename
            description
          }
          description
        }
      }
    }
  }
`;
export const UpdatePurchaseOrderLineDocument = gql`
  mutation updatePurchaseOrderLine(
    $input: UpdatePurchaseOrderLineInput!
    $storeId: String!
  ) {
    updatePurchaseOrderLine(input: $input, storeId: $storeId) {
      ... on IdResponse {
        id
      }
      ... on UpdatePurchaseOrderLineError {
        __typename
        error {
          description
          ... on CannotEditPurchaseOrder {
            __typename
            description
          }
          ... on PurchaseOrderDoesNotExist {
            __typename
            description
          }
          ... on UpdatedLineDoesNotExist {
            __typename
            description
          }
          ... on PurchaseOrderLineNotFound {
            __typename
            description
          }
          ... on ItemCannotBeOrdered {
            ...ItemCannotBeOrdered
          }
          ... on CannotEditQuantityBelowReceived {
            __typename
            description
          }
        }
      }
    }
  }
  ${ItemCannotBeOrderedFragmentDoc}
`;
export const DeletePurchaseOrderLinesDocument = gql`
  mutation deletePurchaseOrderLines($ids: [String!]!, $storeId: String!) {
    deletePurchaseOrderLines(ids: $ids, storeId: $storeId) {
      id
      response {
        ... on DeleteResponse {
          id
        }
        ... on DeletePurchaseOrderLineError {
          __typename
          error {
            description
            ... on RecordNotFound {
              __typename
              description
            }
          }
        }
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
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<PurchaseOrdersQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PurchaseOrdersQuery>({
            document: PurchaseOrdersDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'purchaseOrders',
        'query',
        variables
      );
    },
    purchaseOrderById(
      variables: PurchaseOrderByIdQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<PurchaseOrderByIdQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PurchaseOrderByIdQuery>({
            document: PurchaseOrderByIdDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'purchaseOrderById',
        'query',
        variables
      );
    },
    insertPurchaseOrder(
      variables: InsertPurchaseOrderMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<InsertPurchaseOrderMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertPurchaseOrderMutation>({
            document: InsertPurchaseOrderDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'insertPurchaseOrder',
        'mutation',
        variables
      );
    },
    updatePurchaseOrder(
      variables: UpdatePurchaseOrderMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<UpdatePurchaseOrderMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdatePurchaseOrderMutation>({
            document: UpdatePurchaseOrderDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updatePurchaseOrder',
        'mutation',
        variables
      );
    },
    deletePurchaseOrder(
      variables: DeletePurchaseOrderMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<DeletePurchaseOrderMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeletePurchaseOrderMutation>({
            document: DeletePurchaseOrderDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'deletePurchaseOrder',
        'mutation',
        variables
      );
    },
    purchaseOrderLines(
      variables: PurchaseOrderLinesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<PurchaseOrderLinesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PurchaseOrderLinesQuery>({
            document: PurchaseOrderLinesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'purchaseOrderLines',
        'query',
        variables
      );
    },
    purchaseOrderLine(
      variables: PurchaseOrderLineQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<PurchaseOrderLineQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PurchaseOrderLineQuery>({
            document: PurchaseOrderLineDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'purchaseOrderLine',
        'query',
        variables
      );
    },
    purchaseOrderLinesCount(
      variables: PurchaseOrderLinesCountQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<PurchaseOrderLinesCountQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PurchaseOrderLinesCountQuery>({
            document: PurchaseOrderLinesCountDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'purchaseOrderLinesCount',
        'query',
        variables
      );
    },
    insertPurchaseOrderLine(
      variables: InsertPurchaseOrderLineMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<InsertPurchaseOrderLineMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertPurchaseOrderLineMutation>({
            document: InsertPurchaseOrderLineDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'insertPurchaseOrderLine',
        'mutation',
        variables
      );
    },
    addToPurchaseOrderFromMasterList(
      variables: AddToPurchaseOrderFromMasterListMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<AddToPurchaseOrderFromMasterListMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<AddToPurchaseOrderFromMasterListMutation>({
            document: AddToPurchaseOrderFromMasterListDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'addToPurchaseOrderFromMasterList',
        'mutation',
        variables
      );
    },
    updatePurchaseOrderLine(
      variables: UpdatePurchaseOrderLineMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<UpdatePurchaseOrderLineMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdatePurchaseOrderLineMutation>({
            document: UpdatePurchaseOrderLineDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updatePurchaseOrderLine',
        'mutation',
        variables
      );
    },
    deletePurchaseOrderLines(
      variables: DeletePurchaseOrderLinesMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<DeletePurchaseOrderLinesMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeletePurchaseOrderLinesMutation>({
            document: DeletePurchaseOrderLinesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'deletePurchaseOrderLines',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
