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

export type GoodsReceivedFragment = {
  __typename: 'GoodsReceivedNode';
  id: string;
  number: number;
  status: Types.GoodsReceivedNodeStatus;
  comment?: string | null;
  createdBy?: string | null;
  createdDatetime: string;
  receivedDatetime?: string | null;
  finalisedDatetime?: string | null;
  purchaseOrderNumber?: number | null;
  supplierReference?: string | null;
  supplier?: { __typename: 'NameNode'; id: string; name: string } | null;
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
        number: number;
        status: Types.GoodsReceivedNodeStatus;
        comment?: string | null;
        createdBy?: string | null;
        createdDatetime: string;
        receivedDatetime?: string | null;
        finalisedDatetime?: string | null;
        purchaseOrderNumber?: number | null;
        supplierReference?: string | null;
        supplier?: { __typename: 'NameNode'; id: string; name: string } | null;
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

export type DeleteGoodsReceivedMutationVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type DeleteGoodsReceivedMutation = {
  __typename: 'Mutations';
  deleteGoodsReceived: { __typename: 'DeleteResponse'; id: string };
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
export const GoodsReceivedFragmentDoc = gql`
  fragment GoodsReceived on GoodsReceivedNode {
    __typename
    id
    number
    status
    comment
    createdBy
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
      __typename
      ... on RecordNotFound {
        __typename
        description
      }
      ... on GoodsReceivedNode {
        ...GoodsReceived
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
export const DeleteGoodsReceivedDocument = gql`
  mutation deleteGoodsReceived($id: String!, $storeId: String!) {
    deleteGoodsReceived(id: $id, storeId: $storeId) {
      ... on DeleteResponse {
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
  };
}
export type Sdk = ReturnType<typeof getSdk>;
