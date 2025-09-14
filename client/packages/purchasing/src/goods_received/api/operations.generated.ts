import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type GoodsReceivedRowFragment = {
  __typename: 'GoodsReceivedNode';
  id: string;
  number: number;
  status: Types.GoodsReceivedNodeStatus;
  comment?: string | null;
  createdDatetime: string;
  receivedDatetime?: string | null;
  finalisedDatetime?: string | null;
  purchaseOrderNumber?: number | null;
  supplierReference?: string | null;
  supplier?: { __typename: 'NameNode'; id: string; name: string } | null;
};

export type GoodsReceivedLineFragment = {
  __typename: 'GoodsReceivedLineNode';
  id: string;
  batch?: string | null;
  comment?: string | null;
  lineNumber: number;
  goodsReceivedId: string;
  expiryDate?: string | null;
  manufacturerLinkId?: string | null;
  numberOfPacksReceived: number;
  receivedPackSize: number;
  purchaseOrderLineId: string;
  item: { __typename: 'ItemNode'; id: string; code: string; name: string };
};

export type GoodsReceivedFragment = {
  __typename: 'GoodsReceivedNode';
  id: string;
  comment?: string | null;
  createdDatetime: string;
  number: number;
  finalisedDatetime?: string | null;
  purchaseOrderNumber?: number | null;
  purchaseOrderId?: string | null;
  receivedDatetime?: string | null;
  supplierReference?: string | null;
  status: Types.GoodsReceivedNodeStatus;
  donor?: { __typename: 'NameNode'; id: string; name: string } | null;
  user?: { __typename: 'UserNode'; username: string } | null;
  supplier?: { __typename: 'NameNode'; id: string; name: string } | null;
  lines: {
    __typename: 'GoodsReceivedLineConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'GoodsReceivedLineNode';
      id: string;
      batch?: string | null;
      comment?: string | null;
      lineNumber: number;
      goodsReceivedId: string;
      expiryDate?: string | null;
      manufacturerLinkId?: string | null;
      numberOfPacksReceived: number;
      receivedPackSize: number;
      purchaseOrderLineId: string;
      item: { __typename: 'ItemNode'; id: string; code: string; name: string };
    }>;
  };
};

export type GoodsReceivedListQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.GoodsReceivedSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.GoodsReceivedFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;

export type GoodsReceivedListQuery = {
  __typename: 'Queries';
  goodsReceivedList: {
    __typename: 'GoodsReceivedConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'GoodsReceivedNode';
      id: string;
      number: number;
      status: Types.GoodsReceivedNodeStatus;
      comment?: string | null;
      createdDatetime: string;
      receivedDatetime?: string | null;
      finalisedDatetime?: string | null;
      purchaseOrderNumber?: number | null;
      supplierReference?: string | null;
      supplier?: { __typename: 'NameNode'; id: string; name: string } | null;
    }>;
  };
};

export type GoodsReceivedByIdQueryVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type GoodsReceivedByIdQuery = {
  __typename: 'Queries';
  goodsReceived:
    | {
        __typename: 'GoodsReceivedNode';
        id: string;
        comment?: string | null;
        createdDatetime: string;
        number: number;
        finalisedDatetime?: string | null;
        purchaseOrderNumber?: number | null;
        purchaseOrderId?: string | null;
        receivedDatetime?: string | null;
        supplierReference?: string | null;
        status: Types.GoodsReceivedNodeStatus;
        donor?: { __typename: 'NameNode'; id: string; name: string } | null;
        user?: { __typename: 'UserNode'; username: string } | null;
        supplier?: { __typename: 'NameNode'; id: string; name: string } | null;
        lines: {
          __typename: 'GoodsReceivedLineConnector';
          totalCount: number;
          nodes: Array<{
            __typename: 'GoodsReceivedLineNode';
            id: string;
            batch?: string | null;
            comment?: string | null;
            lineNumber: number;
            goodsReceivedId: string;
            expiryDate?: string | null;
            manufacturerLinkId?: string | null;
            numberOfPacksReceived: number;
            receivedPackSize: number;
            purchaseOrderLineId: string;
            item: {
              __typename: 'ItemNode';
              id: string;
              code: string;
              name: string;
            };
          }>;
        };
      }
    | { __typename: 'RecordNotFound'; description: string };
};

export type InsertGoodsReceivedMutationVariables = Types.Exact<{
  input: Types.InsertGoodsReceivedInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type InsertGoodsReceivedMutation = {
  __typename: 'Mutations';
  insertGoodsReceived: { __typename: 'IdResponse'; id: string };
};

export type UpdateGoodsReceivedMutationVariables = Types.Exact<{
  input: Types.UpdateGoodsReceivedInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type UpdateGoodsReceivedMutation = {
  __typename: 'Mutations';
  updateGoodsReceived:
    | { __typename: 'IdResponse'; id: string }
    | {
        __typename: 'UpdateGoodsReceivedError';
        error:
          | { __typename: 'GoodsReceivedEmpty'; description: string }
          | { __typename: 'NoAuthorisedLines'; description: string }
          | { __typename: 'PurchaseOrderNotFinalised'; description: string };
      };
};

export type DeleteGoodsReceivedMutationVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type DeleteGoodsReceivedMutation = {
  __typename: 'Mutations';
  deleteGoodsReceived: { __typename: 'DeleteResponse'; id: string };
};

export type GoodsReceivedLinesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.GoodsReceivedLineSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.GoodsReceivedLineFilterInput>;
}>;

export type GoodsReceivedLinesQuery = {
  __typename: 'Queries';
  goodsReceivedLines: {
    __typename: 'GoodsReceivedLineConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'GoodsReceivedLineNode';
      id: string;
      batch?: string | null;
      comment?: string | null;
      lineNumber: number;
      goodsReceivedId: string;
      expiryDate?: string | null;
      manufacturerLinkId?: string | null;
      numberOfPacksReceived: number;
      receivedPackSize: number;
      purchaseOrderLineId: string;
      item: { __typename: 'ItemNode'; id: string; code: string; name: string };
    }>;
  };
};

export type GoodsReceivedLineQueryVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type GoodsReceivedLineQuery = {
  __typename: 'Queries';
  goodsReceivedLines: {
    __typename: 'GoodsReceivedLineConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'GoodsReceivedLineNode';
      id: string;
      batch?: string | null;
      comment?: string | null;
      lineNumber: number;
      goodsReceivedId: string;
      expiryDate?: string | null;
      manufacturerLinkId?: string | null;
      numberOfPacksReceived: number;
      receivedPackSize: number;
      purchaseOrderLineId: string;
      item: { __typename: 'ItemNode'; id: string; code: string; name: string };
    }>;
  };
};

export type GoodsReceivedLinesCountQueryVariables = Types.Exact<{
  filter?: Types.InputMaybe<Types.GoodsReceivedLineFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;

export type GoodsReceivedLinesCountQuery = {
  __typename: 'Queries';
  goodsReceivedLines: {
    __typename: 'GoodsReceivedLineConnector';
    totalCount: number;
  };
};

export type InsertGoodsReceivedLineMutationVariables = Types.Exact<{
  input: Types.InsertGoodsReceivedLineInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type InsertGoodsReceivedLineMutation = {
  __typename: 'Mutations';
  insertGoodsReceivedLine:
    | { __typename: 'IdResponse'; id: string }
    | {
        __typename: 'InsertGoodsReceivedLineError';
        error:
          | { __typename: 'CannotEditGoodsReceived'; description: string }
          | {
              __typename: 'ForeignKeyError';
              description: string;
              key: Types.ForeignKey;
            }
          | { __typename: 'GoodsReceivedLineWithIdExists'; description: string }
          | {
              __typename: 'PurchaseOrderLineDoesNotExist';
              description: string;
            };
      };
};

export type InsertGoodsReceivedLinesFromPurchaseOrderMutationVariables =
  Types.Exact<{
    input: Types.InsertGoodsReceivedLinesFromPurchaseOrderInput;
    storeId: Types.Scalars['String']['input'];
  }>;

export type InsertGoodsReceivedLinesFromPurchaseOrderMutation = {
  __typename: 'Mutations';
  insertGoodsReceivedLinesFromPurchaseOrder:
    | {
        __typename: 'InsertGoodsReceivedLinesError';
        error:
          | { __typename: 'CannotEditGoodsReceived'; description: string }
          | {
              __typename: 'ForeignKeyError';
              description: string;
              key: Types.ForeignKey;
            }
          | { __typename: 'PurchaseOrderNotFound'; description: string };
      }
    | {
        __typename: 'InsertLinesFromPurchaseOrderResponseNode';
        ids: Array<string>;
      };
};

export type SaveGoodsReceivedLinesMutationVariables = Types.Exact<{
  input: Types.SaveGoodsReceivedLinesInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type SaveGoodsReceivedLinesMutation = {
  __typename: 'Mutations';
  saveGoodsReceivedLines: { __typename: 'IdResponse'; id: string };
};

export const GoodsReceivedRowFragmentDoc = gql`
  fragment GoodsReceivedRow on GoodsReceivedNode {
    id
    number
    status
    comment
    createdDatetime
    receivedDatetime
    finalisedDatetime
    purchaseOrderNumber
    supplierReference
    supplier {
      id
      name
    }
  }
`;
export const GoodsReceivedLineFragmentDoc = gql`
  fragment GoodsReceivedLine on GoodsReceivedLineNode {
    __typename
    id
    batch
    comment
    lineNumber
    goodsReceivedId
    expiryDate
    manufacturerLinkId
    numberOfPacksReceived
    receivedPackSize
    item {
      id
      code
      name
    }
    purchaseOrderLineId
    goodsReceivedId
  }
`;
export const GoodsReceivedFragmentDoc = gql`
  fragment GoodsReceived on GoodsReceivedNode {
    __typename
    id
    comment
    createdDatetime
    number
    finalisedDatetime
    purchaseOrderNumber
    purchaseOrderId
    receivedDatetime
    supplierReference
    donor(storeId: $storeId) {
      id
      name
    }
    status
    user {
      username
    }
    supplier {
      id
      name
    }
    lines {
      totalCount
      nodes {
        ...GoodsReceivedLine
      }
    }
  }
  ${GoodsReceivedLineFragmentDoc}
`;
export const GoodsReceivedListDocument = gql`
  query goodsReceivedList(
    $first: Int
    $offset: Int
    $key: GoodsReceivedSortFieldInput!
    $desc: Boolean
    $filter: GoodsReceivedFilterInput
    $storeId: String!
  ) {
    goodsReceivedList(
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
      filter: $filter
      storeId: $storeId
    ) {
      ... on GoodsReceivedConnector {
        __typename
        nodes {
          ...GoodsReceivedRow
        }
        totalCount
      }
    }
  }
  ${GoodsReceivedRowFragmentDoc}
`;
export const GoodsReceivedByIdDocument = gql`
  query goodsReceivedById($id: String!, $storeId: String!) {
    goodsReceived(id: $id, storeId: $storeId) {
      ... on GoodsReceivedNode {
        ...GoodsReceived
      }
      ... on RecordNotFound {
        __typename
        description
      }
    }
  }
  ${GoodsReceivedFragmentDoc}
`;
export const InsertGoodsReceivedDocument = gql`
  mutation insertGoodsReceived(
    $input: InsertGoodsReceivedInput!
    $storeId: String!
  ) {
    insertGoodsReceived(input: $input, storeId: $storeId) {
      ... on IdResponse {
        id
      }
    }
  }
`;
export const UpdateGoodsReceivedDocument = gql`
  mutation updateGoodsReceived(
    $input: UpdateGoodsReceivedInput!
    $storeId: String!
  ) {
    updateGoodsReceived(input: $input, storeId: $storeId) {
      ... on IdResponse {
        id
      }
      ... on UpdateGoodsReceivedError {
        __typename
        error {
          description
          ... on GoodsReceivedEmpty {
            __typename
          }
          ... on PurchaseOrderNotFinalised {
            __typename
          }
          ... on NoAuthorisedLines {
            __typename
          }
        }
      }
    }
  }
`;
export const DeleteGoodsReceivedDocument = gql`
  mutation deleteGoodsReceived($id: String!, $storeId: String!) {
    deleteGoodsReceived(id: $id, storeId: $storeId) {
      ... on DeleteResponse {
        id
      }
    }
  }
`;
export const GoodsReceivedLinesDocument = gql`
  query goodsReceivedLines(
    $storeId: String!
    $first: Int
    $offset: Int
    $key: GoodsReceivedLineSortFieldInput!
    $desc: Boolean
    $filter: GoodsReceivedLineFilterInput
  ) {
    goodsReceivedLines(
      storeId: $storeId
      filter: $filter
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
    ) {
      ... on GoodsReceivedLineConnector {
        __typename
        nodes {
          __typename
          ...GoodsReceivedLine
        }
        totalCount
      }
    }
  }
  ${GoodsReceivedLineFragmentDoc}
`;
export const GoodsReceivedLineDocument = gql`
  query goodsReceivedLine($id: String!, $storeId: String!) {
    goodsReceivedLines(storeId: $storeId, filter: { id: { equalTo: $id } }) {
      ... on GoodsReceivedLineConnector {
        __typename
        nodes {
          __typename
          ...GoodsReceivedLine
        }
        totalCount
      }
    }
  }
  ${GoodsReceivedLineFragmentDoc}
`;
export const GoodsReceivedLinesCountDocument = gql`
  query goodsReceivedLinesCount(
    $filter: GoodsReceivedLineFilterInput
    $storeId: String!
  ) {
    goodsReceivedLines(storeId: $storeId, filter: $filter) {
      ... on GoodsReceivedLineConnector {
        __typename
        totalCount
      }
    }
  }
`;
export const InsertGoodsReceivedLineDocument = gql`
  mutation insertGoodsReceivedLine(
    $input: InsertGoodsReceivedLineInput!
    $storeId: String!
  ) {
    insertGoodsReceivedLine(input: $input, storeId: $storeId) {
      ... on IdResponse {
        id
      }
      ... on InsertGoodsReceivedLineError {
        __typename
        error {
          description
          ... on CannotEditGoodsReceived {
            __typename
            description
          }
          ... on ForeignKeyError {
            __typename
            description
            key
          }
          ... on GoodsReceivedLineWithIdExists {
            __typename
            description
          }
        }
      }
    }
  }
`;
export const InsertGoodsReceivedLinesFromPurchaseOrderDocument = gql`
  mutation insertGoodsReceivedLinesFromPurchaseOrder(
    $input: InsertGoodsReceivedLinesFromPurchaseOrderInput!
    $storeId: String!
  ) {
    insertGoodsReceivedLinesFromPurchaseOrder(
      input: $input
      storeId: $storeId
    ) {
      ... on InsertLinesFromPurchaseOrderResponseNode {
        __typename
        ids
      }
      ... on InsertGoodsReceivedLinesError {
        __typename
        error {
          description
          ... on PurchaseOrderNotFound {
            __typename
            description
          }
          ... on ForeignKeyError {
            __typename
            description
            key
          }
          ... on CannotEditGoodsReceived {
            __typename
            description
          }
        }
      }
    }
  }
`;
export const SaveGoodsReceivedLinesDocument = gql`
  mutation saveGoodsReceivedLines(
    $input: SaveGoodsReceivedLinesInput!
    $storeId: String!
  ) {
    saveGoodsReceivedLines(input: $input, storeId: $storeId) {
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
    goodsReceivedList(
      variables: GoodsReceivedListQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<GoodsReceivedListQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<GoodsReceivedListQuery>(
            GoodsReceivedListDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'goodsReceivedList',
        'query',
        variables
      );
    },
    goodsReceivedById(
      variables: GoodsReceivedByIdQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<GoodsReceivedByIdQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<GoodsReceivedByIdQuery>(
            GoodsReceivedByIdDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'goodsReceivedById',
        'query',
        variables
      );
    },
    insertGoodsReceived(
      variables: InsertGoodsReceivedMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InsertGoodsReceivedMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertGoodsReceivedMutation>(
            InsertGoodsReceivedDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertGoodsReceived',
        'mutation',
        variables
      );
    },
    updateGoodsReceived(
      variables: UpdateGoodsReceivedMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<UpdateGoodsReceivedMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateGoodsReceivedMutation>(
            UpdateGoodsReceivedDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'updateGoodsReceived',
        'mutation',
        variables
      );
    },
    deleteGoodsReceived(
      variables: DeleteGoodsReceivedMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<DeleteGoodsReceivedMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteGoodsReceivedMutation>(
            DeleteGoodsReceivedDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'deleteGoodsReceived',
        'mutation',
        variables
      );
    },
    goodsReceivedLines(
      variables: GoodsReceivedLinesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<GoodsReceivedLinesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<GoodsReceivedLinesQuery>(
            GoodsReceivedLinesDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'goodsReceivedLines',
        'query',
        variables
      );
    },
    goodsReceivedLine(
      variables: GoodsReceivedLineQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<GoodsReceivedLineQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<GoodsReceivedLineQuery>(
            GoodsReceivedLineDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'goodsReceivedLine',
        'query',
        variables
      );
    },
    goodsReceivedLinesCount(
      variables: GoodsReceivedLinesCountQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<GoodsReceivedLinesCountQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<GoodsReceivedLinesCountQuery>(
            GoodsReceivedLinesCountDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'goodsReceivedLinesCount',
        'query',
        variables
      );
    },
    insertGoodsReceivedLine(
      variables: InsertGoodsReceivedLineMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InsertGoodsReceivedLineMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertGoodsReceivedLineMutation>(
            InsertGoodsReceivedLineDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertGoodsReceivedLine',
        'mutation',
        variables
      );
    },
    insertGoodsReceivedLinesFromPurchaseOrder(
      variables: InsertGoodsReceivedLinesFromPurchaseOrderMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InsertGoodsReceivedLinesFromPurchaseOrderMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertGoodsReceivedLinesFromPurchaseOrderMutation>(
            InsertGoodsReceivedLinesFromPurchaseOrderDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertGoodsReceivedLinesFromPurchaseOrder',
        'mutation',
        variables
      );
    },
    saveGoodsReceivedLines(
      variables: SaveGoodsReceivedLinesMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<SaveGoodsReceivedLinesMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SaveGoodsReceivedLinesMutation>(
            SaveGoodsReceivedLinesDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'saveGoodsReceivedLines',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
