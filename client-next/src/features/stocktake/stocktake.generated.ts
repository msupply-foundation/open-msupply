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
  item: {
    __typename: 'ItemNode';
    id: string;
    code: string;
    name: string;
    defaultPackSize: number;
  };
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
      item: {
        __typename: 'ItemNode';
        id: string;
        code: string;
        name: string;
        defaultPackSize: number;
      };
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

export type SaveStocktakeLinesMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  insertStocktakeLines?: Types.InputMaybe<
    Array<Types.InsertStocktakeLineInput> | Types.InsertStocktakeLineInput
  >;
  updateStocktakeLines?: Types.InputMaybe<
    Array<Types.UpdateStocktakeLineInput> | Types.UpdateStocktakeLineInput
  >;
}>;

export type SaveStocktakeLinesMutation = {
  __typename: 'Mutations';
  batchStocktake: {
    __typename: 'BatchStocktakeResponse';
    insertStocktakeLines?: Array<{
      __typename: 'InsertStocktakeLineResponseWithId';
      id: string;
      response:
        | {
            __typename: 'InsertStocktakeLineError';
            error:
              | {
                  __typename: 'AdjustmentReasonNotProvided';
                  description: string;
                }
              | { __typename: 'AdjustmentReasonNotValid'; description: string }
              | { __typename: 'CannotEditStocktake'; description: string }
              | {
                  __typename: 'StockLineReducedBelowZero';
                  description: string;
                };
          }
        | { __typename: 'StocktakeLineNode' };
    }> | null;
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

export type InsertStocktakeMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertStocktakeInput;
}>;

export type InsertStocktakeMutation = {
  __typename: 'Mutations';
  insertStocktake: { __typename: 'StocktakeNode'; id: string };
};

export type LocationOptionFragment = {
  __typename: 'LocationNode';
  id: string;
  code: string;
  name: string;
};

export type StocktakeLocationsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  filter?: Types.InputMaybe<Types.LocationFilterInput>;
}>;

export type StocktakeLocationsQuery = {
  __typename: 'Queries';
  locations: {
    __typename: 'LocationConnector';
    nodes: Array<{
      __typename: 'LocationNode';
      id: string;
      code: string;
      name: string;
    }>;
  };
};

export type MasterListOptionFragment = {
  __typename: 'MasterListNode';
  id: string;
  code: string;
  name: string;
};

export type StocktakeMasterListsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  filter?: Types.InputMaybe<Types.MasterListFilterInput>;
}>;

export type StocktakeMasterListsQuery = {
  __typename: 'Queries';
  masterLists: {
    __typename: 'MasterListConnector';
    nodes: Array<{
      __typename: 'MasterListNode';
      id: string;
      code: string;
      name: string;
    }>;
  };
};

export type VvmStatusOptionFragment = {
  __typename: 'VvmstatusNode';
  id: string;
  code: string;
  description: string;
};

export type StocktakeVvmStatusesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;

export type StocktakeVvmStatusesQuery = {
  __typename: 'Queries';
  activeVvmStatuses: {
    __typename: 'VvmstatusConnector';
    nodes: Array<{
      __typename: 'VvmstatusNode';
      id: string;
      code: string;
      description: string;
    }>;
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
      defaultPackSize
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
export const LocationOptionFragmentDoc = gql`
  fragment LocationOption on LocationNode {
    __typename
    id
    code
    name
  }
`;
export const MasterListOptionFragmentDoc = gql`
  fragment MasterListOption on MasterListNode {
    __typename
    id
    code
    name
  }
`;
export const VvmStatusOptionFragmentDoc = gql`
  fragment VvmStatusOption on VvmstatusNode {
    __typename
    id
    code
    description
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
export const SaveStocktakeLinesDocument = gql`
  mutation saveStocktakeLines(
    $storeId: String!
    $insertStocktakeLines: [InsertStocktakeLineInput!]
    $updateStocktakeLines: [UpdateStocktakeLineInput!]
  ) {
    batchStocktake(
      storeId: $storeId
      input: {
        insertStocktakeLines: $insertStocktakeLines
        updateStocktakeLines: $updateStocktakeLines
      }
    ) {
      ... on BatchStocktakeResponse {
        __typename
        insertStocktakeLines {
          id
          response {
            __typename
            ... on InsertStocktakeLineError {
              error {
                __typename
                description
              }
            }
          }
        }
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
export const InsertStocktakeDocument = gql`
  mutation insertStocktake($storeId: String!, $input: InsertStocktakeInput!) {
    insertStocktake(storeId: $storeId, input: $input) {
      ... on StocktakeNode {
        __typename
        id
      }
    }
  }
`;
export const StocktakeLocationsDocument = gql`
  query stocktakeLocations($storeId: String!, $filter: LocationFilterInput) {
    locations(storeId: $storeId, filter: $filter, page: { first: 100 }) {
      ... on LocationConnector {
        __typename
        nodes {
          ...LocationOption
        }
      }
    }
  }
  ${LocationOptionFragmentDoc}
`;
export const StocktakeMasterListsDocument = gql`
  query stocktakeMasterLists(
    $storeId: String!
    $filter: MasterListFilterInput
  ) {
    masterLists(storeId: $storeId, filter: $filter, page: { first: 100 }) {
      ... on MasterListConnector {
        __typename
        nodes {
          ...MasterListOption
        }
      }
    }
  }
  ${MasterListOptionFragmentDoc}
`;
export const StocktakeVvmStatusesDocument = gql`
  query stocktakeVvmStatuses($storeId: String!) {
    activeVvmStatuses(storeId: $storeId) {
      ... on VvmstatusConnector {
        __typename
        nodes {
          ...VvmStatusOption
        }
      }
    }
  }
  ${VvmStatusOptionFragmentDoc}
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
    saveStocktakeLines(
      variables: SaveStocktakeLinesMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<SaveStocktakeLinesMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SaveStocktakeLinesMutation>({
            document: SaveStocktakeLinesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'saveStocktakeLines',
        'mutation',
        variables,
      );
    },
    insertStocktake(
      variables: InsertStocktakeMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<InsertStocktakeMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertStocktakeMutation>({
            document: InsertStocktakeDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'insertStocktake',
        'mutation',
        variables,
      );
    },
    stocktakeLocations(
      variables: StocktakeLocationsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<StocktakeLocationsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<StocktakeLocationsQuery>({
            document: StocktakeLocationsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'stocktakeLocations',
        'query',
        variables,
      );
    },
    stocktakeMasterLists(
      variables: StocktakeMasterListsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<StocktakeMasterListsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<StocktakeMasterListsQuery>({
            document: StocktakeMasterListsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'stocktakeMasterLists',
        'query',
        variables,
      );
    },
    stocktakeVvmStatuses(
      variables: StocktakeVvmStatusesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<StocktakeVvmStatusesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<StocktakeVvmStatusesQuery>({
            document: StocktakeVvmStatusesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'stocktakeVvmStatuses',
        'query',
        variables,
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
