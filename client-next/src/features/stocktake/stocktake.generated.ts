import * as Types from '../../gql/schema';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type StocktakeLineRowFragment = {
  __typename: 'StocktakeLineNode';
  id: string;
  itemName: string;
  batch?: string | null;
  expiryDate?: string | null;
  packSize?: number | null;
  snapshotNumberOfPacks: number;
  countedNumberOfPacks?: number | null;
  costPricePerPack?: number | null;
  sellPricePerPack?: number | null;
  comment?: string | null;
  reasonOption?: {
    __typename: 'ReasonOptionNode';
    id: string;
    type: Types.ReasonOptionNodeType;
    reason: string;
  } | null;
  item: { __typename: 'ItemNode'; id: string; code: string; name: string };
};

export type ReasonOptionRowFragment = {
  __typename: 'ReasonOptionNode';
  id: string;
  type: Types.ReasonOptionNodeType;
  reason: string;
};

export type ReasonOptionsQueryVariables = Types.Exact<{ [key: string]: never }>;

export type ReasonOptionsQuery = {
  __typename: 'Queries';
  reasonOptions: {
    __typename: 'ReasonOptionConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'ReasonOptionNode';
      id: string;
      type: Types.ReasonOptionNodeType;
      reason: string;
    }>;
  };
};

export type StocktakeRowFragment = {
  __typename: 'StocktakeNode';
  id: string;
  stocktakeNumber: number;
  status: Types.StocktakeNodeStatus;
  description?: string | null;
  comment?: string | null;
  isLocked: boolean;
};

export type StocktakesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;

export type StocktakesQuery = {
  __typename: 'Queries';
  stocktakes: {
    __typename: 'StocktakeConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'StocktakeNode';
      id: string;
      stocktakeNumber: number;
      status: Types.StocktakeNodeStatus;
      description?: string | null;
      comment?: string | null;
      isLocked: boolean;
    }>;
  };
};

export type StocktakeQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  stocktakeId: Types.Scalars['String']['input'];
}>;

export type StocktakeQuery = {
  __typename: 'Queries';
  stocktake:
    | { __typename: 'NodeError' }
    | {
        __typename: 'StocktakeNode';
        id: string;
        stocktakeNumber: number;
        status: Types.StocktakeNodeStatus;
        description?: string | null;
        comment?: string | null;
        isLocked: boolean;
      };
};

export type StocktakeLinesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  stocktakeId: Types.Scalars['String']['input'];
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
}>;

export type StocktakeLinesQuery = {
  __typename: 'Queries';
  stocktakeLines: {
    __typename: 'StocktakeLineConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'StocktakeLineNode';
      id: string;
      itemName: string;
      batch?: string | null;
      expiryDate?: string | null;
      packSize?: number | null;
      snapshotNumberOfPacks: number;
      countedNumberOfPacks?: number | null;
      costPricePerPack?: number | null;
      sellPricePerPack?: number | null;
      comment?: string | null;
      reasonOption?: {
        __typename: 'ReasonOptionNode';
        id: string;
        type: Types.ReasonOptionNodeType;
        reason: string;
      } | null;
      item: { __typename: 'ItemNode'; id: string; code: string; name: string };
    }>;
  };
};

export type UpsertStocktakeLinesMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  updateStocktakeLines?: Types.InputMaybe<
    Array<Types.UpdateStocktakeLineInput> | Types.UpdateStocktakeLineInput
  >;
}>;

export type UpsertStocktakeLinesMutation = {
  __typename: 'Mutations';
  batchStocktake: {
    __typename: 'BatchStocktakeResponse';
    updateStocktakeLines?: Array<{
      __typename: 'UpdateStocktakeLineResponseWithId';
      id: string;
      response:
        | { __typename: 'StocktakeLineNode' }
        | {
            __typename: 'UpdateStocktakeLineError';
            error:
              | {
                  __typename: 'AdjustmentReasonNotProvided';
                  description: string;
                }
              | { __typename: 'AdjustmentReasonNotValid'; description: string }
              | { __typename: 'CannotEditStocktake'; description: string }
              | {
                  __typename: 'SnapshotCountCurrentCountMismatchLine';
                  description: string;
                }
              | {
                  __typename: 'StockLineReducedBelowZero';
                  description: string;
                };
          };
    }> | null;
  };
};

export const StocktakeLineRowFragmentDoc = gql`
  fragment StocktakeLineRow on StocktakeLineNode {
    __typename
    id
    itemName
    batch
    expiryDate
    packSize
    snapshotNumberOfPacks
    countedNumberOfPacks
    costPricePerPack
    sellPricePerPack
    comment
    reasonOption {
      __typename
      id
      type
      reason
    }
    item {
      __typename
      id
      code
      name
    }
  }
`;
export const ReasonOptionRowFragmentDoc = gql`
  fragment ReasonOptionRow on ReasonOptionNode {
    __typename
    id
    type
    reason
  }
`;
export const StocktakeRowFragmentDoc = gql`
  fragment StocktakeRow on StocktakeNode {
    __typename
    id
    stocktakeNumber
    status
    description
    comment
    isLocked
  }
`;
export const ReasonOptionsDocument = gql`
  query reasonOptions {
    reasonOptions(filter: { isActive: true }, page: { first: 1000 }) {
      ... on ReasonOptionConnector {
        __typename
        totalCount
        nodes {
          ...ReasonOptionRow
        }
      }
    }
  }
  ${ReasonOptionRowFragmentDoc}
`;
export const StocktakesDocument = gql`
  query stocktakes($storeId: String!) {
    stocktakes(storeId: $storeId) {
      ... on StocktakeConnector {
        __typename
        totalCount
        nodes {
          ...StocktakeRow
        }
      }
    }
  }
  ${StocktakeRowFragmentDoc}
`;
export const StocktakeDocument = gql`
  query stocktake($storeId: String!, $stocktakeId: String!) {
    stocktake(id: $stocktakeId, storeId: $storeId) {
      ... on StocktakeNode {
        ...StocktakeRow
      }
    }
  }
  ${StocktakeRowFragmentDoc}
`;
export const StocktakeLinesDocument = gql`
  query stocktakeLines($storeId: String!, $stocktakeId: String!, $first: Int) {
    stocktakeLines(
      storeId: $storeId
      stocktakeId: $stocktakeId
      page: { first: $first }
    ) {
      ... on StocktakeLineConnector {
        __typename
        totalCount
        nodes {
          ...StocktakeLineRow
        }
      }
    }
  }
  ${StocktakeLineRowFragmentDoc}
`;
export const UpsertStocktakeLinesDocument = gql`
  mutation upsertStocktakeLines(
    $storeId: String!
    $updateStocktakeLines: [UpdateStocktakeLineInput!]
  ) {
    batchStocktake(
      storeId: $storeId
      input: { updateStocktakeLines: $updateStocktakeLines }
    ) {
      ... on BatchStocktakeResponse {
        __typename
        updateStocktakeLines {
          id
          response {
            __typename
            ... on UpdateStocktakeLineError {
              error {
                __typename
                description
              }
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
  variables?: any,
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (
  action,
  _operationName,
  _operationType,
  _variables,
) => action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper,
) {
  return {
    reasonOptions(
      variables?: ReasonOptionsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<ReasonOptionsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ReasonOptionsQuery>({
            document: ReasonOptionsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'reasonOptions',
        'query',
        variables,
      );
    },
    stocktakes(
      variables: StocktakesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<StocktakesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<StocktakesQuery>({
            document: StocktakesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'stocktakes',
        'query',
        variables,
      );
    },
    stocktake(
      variables: StocktakeQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<StocktakeQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<StocktakeQuery>({
            document: StocktakeDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'stocktake',
        'query',
        variables,
      );
    },
    stocktakeLines(
      variables: StocktakeLinesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<StocktakeLinesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<StocktakeLinesQuery>({
            document: StocktakeLinesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'stocktakeLines',
        'query',
        variables,
      );
    },
    upsertStocktakeLines(
      variables: UpsertStocktakeLinesMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<UpsertStocktakeLinesMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpsertStocktakeLinesMutation>({
            document: UpsertStocktakeLinesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'upsertStocktakeLines',
        'mutation',
        variables,
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
