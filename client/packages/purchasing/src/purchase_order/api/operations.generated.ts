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
  reference?: string | null;
  comment?: string | null;
  supplier?: { __typename: 'NameNode'; id: string; name: string } | null;
  lines: { __typename: 'PurchaseOrderLineConnector'; totalCount: number };
};

export type SyncFileReferenceFragment = {
  __typename: 'SyncFileReferenceNode';
  id: string;
  fileName: string;
  recordId: string;
  createdDatetime: string;
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
  lineTotalAfterDiscount: number;
  orderTotalAfterDiscount: number;
  targetMonths?: number | null;
  confirmedDatetime?: string | null;
  contractSignedDate?: string | null;
  advancePaidDate?: string | null;
  receivedAtPortDate?: string | null;
  requestedDeliveryDate?: string | null;
  authorisedDatetime?: string | null;
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
      requestedPackSize: number;
      requestedDeliveryDate?: string | null;
      requestedNumberOfUnits: number;
      adjustedNumberOfUnits?: number | null;
      pricePerUnitAfterDiscount: number;
      pricePerUnitBeforeDiscount: number;
      item: {
        __typename: 'ItemNode';
        id: string;
        code: string;
        name: string;
        unitName?: string | null;
      };
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
};

export type PurchaseOrderLineFragment = {
  __typename: 'PurchaseOrderLineNode';
  id: string;
  expectedDeliveryDate?: string | null;
  purchaseOrderId: string;
  requestedPackSize: number;
  requestedDeliveryDate?: string | null;
  requestedNumberOfUnits: number;
  adjustedNumberOfUnits?: number | null;
  pricePerUnitAfterDiscount: number;
  pricePerUnitBeforeDiscount: number;
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
        lineTotalAfterDiscount: number;
        orderTotalAfterDiscount: number;
        targetMonths?: number | null;
        confirmedDatetime?: string | null;
        contractSignedDate?: string | null;
        advancePaidDate?: string | null;
        receivedAtPortDate?: string | null;
        requestedDeliveryDate?: string | null;
        authorisedDatetime?: string | null;
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
            requestedPackSize: number;
            requestedDeliveryDate?: string | null;
            requestedNumberOfUnits: number;
            adjustedNumberOfUnits?: number | null;
            pricePerUnitAfterDiscount: number;
            pricePerUnitBeforeDiscount: number;
            item: {
              __typename: 'ItemNode';
              id: string;
              code: string;
              name: string;
              unitName?: string | null;
            };
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
          | {
              __typename: 'CannotDeleteNonNewPurchaseOrder';
              description: string;
            }
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
      requestedPackSize: number;
      requestedDeliveryDate?: string | null;
      requestedNumberOfUnits: number;
      adjustedNumberOfUnits?: number | null;
      pricePerUnitAfterDiscount: number;
      pricePerUnitBeforeDiscount: number;
      item: {
        __typename: 'ItemNode';
        id: string;
        code: string;
        name: string;
        unitName?: string | null;
      };
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
      requestedPackSize: number;
      requestedDeliveryDate?: string | null;
      requestedNumberOfUnits: number;
      adjustedNumberOfUnits?: number | null;
      pricePerUnitAfterDiscount: number;
      pricePerUnitBeforeDiscount: number;
      item: {
        __typename: 'ItemNode';
        id: string;
        code: string;
        name: string;
        unitName?: string | null;
      };
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
    | { __typename: 'InsertPurchaseOrderLineError' };
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

export type InsertPurchaseOrderLineFromCsvMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertPurchaseOrderLineFromCsvInput;
}>;

export type InsertPurchaseOrderLineFromCsvMutation = {
  __typename: 'Mutations';
  insertPurchaseOrderLineFromCsv:
    | { __typename: 'IdResponse'; id: string }
    | {
        __typename: 'InsertPurchaseOrderLineError';
        error:
          | { __typename: 'CannnotFindItemByCode'; description: string }
          | { __typename: 'CannotEditPurchaseOrder'; description: string }
          | { __typename: 'ForeignKeyError'; description: string }
          | {
              __typename: 'PackSizeCodeCombinationExists';
              description: string;
              itemCode: string;
              requestedPackSize: number;
            }
          | {
              __typename: 'PurchaseOrderLineWithIdExists';
              description: string;
            };
      };
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
          | { __typename: 'CannotAdjustRequestedQuantity'; description: string }
          | { __typename: 'CannotEditPurchaseOrder'; description: string }
          | { __typename: 'PurchaseOrderDoesNotExist'; description: string }
          | { __typename: 'PurchaseOrderLineNotFound'; description: string }
          | { __typename: 'UpdatedLineDoesNotExist'; description: string };
      };
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
    item {
      id
      code
      name
      unitName
    }
    requestedPackSize
    requestedDeliveryDate
    requestedNumberOfUnits
    adjustedNumberOfUnits
    pricePerUnitAfterDiscount
    pricePerUnitBeforeDiscount
  }
`;
export const SyncFileReferenceFragmentDoc = gql`
  fragment SyncFileReference on SyncFileReferenceNode {
    __typename
    id
    fileName
    recordId
    createdDatetime
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
    lineTotalAfterDiscount
    orderTotalAfterDiscount
    targetMonths
    confirmedDatetime
    contractSignedDate
    advancePaidDate
    receivedAtPortDate
    requestedDeliveryDate
    authorisedDatetime
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
  }
  ${PurchaseOrderLineFragmentDoc}
  ${SyncFileReferenceFragmentDoc}
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
          ... on CannotDeleteNonNewPurchaseOrder {
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
export const InsertPurchaseOrderLineFromCsvDocument = gql`
  mutation insertPurchaseOrderLineFromCsv(
    $storeId: String!
    $input: InsertPurchaseOrderLineFromCSVInput!
  ) {
    insertPurchaseOrderLineFromCsv(input: $input, storeId: $storeId) {
      ... on InsertPurchaseOrderLineError {
        __typename
        error {
          description
          ... on CannnotFindItemByCode {
            __typename
            description
          }
          ... on ForeignKeyError {
            __typename
            description
          }
          ... on CannotEditPurchaseOrder {
            __typename
            description
          }
          ... on PackSizeCodeCombinationExists {
            __typename
            description
            itemCode
            requestedPackSize
          }
          ... on PurchaseOrderLineWithIdExists {
            __typename
            description
          }
        }
      }
      ... on IdResponse {
        __typename
        id
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
    deletePurchaseOrder(
      variables: DeletePurchaseOrderMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<DeletePurchaseOrderMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeletePurchaseOrderMutation>(
            DeletePurchaseOrderDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'deletePurchaseOrder',
        'mutation',
        variables
      );
    },
    purchaseOrderLines(
      variables: PurchaseOrderLinesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<PurchaseOrderLinesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PurchaseOrderLinesQuery>(
            PurchaseOrderLinesDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'purchaseOrderLines',
        'query',
        variables
      );
    },
    purchaseOrderLine(
      variables: PurchaseOrderLineQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<PurchaseOrderLineQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PurchaseOrderLineQuery>(
            PurchaseOrderLineDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'purchaseOrderLine',
        'query',
        variables
      );
    },
    purchaseOrderLinesCount(
      variables: PurchaseOrderLinesCountQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<PurchaseOrderLinesCountQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PurchaseOrderLinesCountQuery>(
            PurchaseOrderLinesCountDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'purchaseOrderLinesCount',
        'query',
        variables
      );
    },
    insertPurchaseOrderLine(
      variables: InsertPurchaseOrderLineMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InsertPurchaseOrderLineMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertPurchaseOrderLineMutation>(
            InsertPurchaseOrderLineDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertPurchaseOrderLine',
        'mutation',
        variables
      );
    },
    addToPurchaseOrderFromMasterList(
      variables: AddToPurchaseOrderFromMasterListMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<AddToPurchaseOrderFromMasterListMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<AddToPurchaseOrderFromMasterListMutation>(
            AddToPurchaseOrderFromMasterListDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'addToPurchaseOrderFromMasterList',
        'mutation',
        variables
      );
    },
    insertPurchaseOrderLineFromCsv(
      variables: InsertPurchaseOrderLineFromCsvMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InsertPurchaseOrderLineFromCsvMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertPurchaseOrderLineFromCsvMutation>(
            InsertPurchaseOrderLineFromCsvDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertPurchaseOrderLineFromCsv',
        'mutation',
        variables
      );
    },
    updatePurchaseOrderLine(
      variables: UpdatePurchaseOrderLineMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<UpdatePurchaseOrderLineMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdatePurchaseOrderLineMutation>(
            UpdatePurchaseOrderLineDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'updatePurchaseOrderLine',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
