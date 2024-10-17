import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type StocktakeRowFragment = { __typename: 'StocktakeNode', id: string, comment?: string | null, description?: string | null, createdDatetime: string, finalisedDatetime?: string | null, stocktakeDate?: string | null, stocktakeNumber: number, status: Types.StocktakeNodeStatus, isLocked: boolean };

export type StocktakeLineFragment = { __typename: 'StocktakeLineNode', stocktakeId: string, batch?: string | null, itemId: string, itemName: string, id: string, expiryDate?: string | null, packSize?: number | null, snapshotNumberOfPacks: number, countedNumberOfPacks?: number | null, sellPricePerPack?: number | null, costPricePerPack?: number | null, comment?: string | null, location?: { __typename: 'LocationNode', id: string, name: string, code: string, onHold: boolean } | null, stockLine?: { __typename: 'StockLineNode', id: string } | null, item: { __typename: 'ItemNode', id: string, code: string, name: string, unitName?: string | null }, inventoryAdjustmentReason?: { __typename: 'InventoryAdjustmentReasonNode', id: string, reason: string } | null };

export type StocktakeFragment = { __typename: 'StocktakeNode', id: string, stocktakeNumber: number, comment?: string | null, createdDatetime: string, finalisedDatetime?: string | null, stocktakeDate?: string | null, status: Types.StocktakeNodeStatus, description?: string | null, isLocked: boolean, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, lines: { __typename: 'StocktakeLineConnector', totalCount: number, nodes: Array<{ __typename: 'StocktakeLineNode', stocktakeId: string, batch?: string | null, itemId: string, itemName: string, id: string, expiryDate?: string | null, packSize?: number | null, snapshotNumberOfPacks: number, countedNumberOfPacks?: number | null, sellPricePerPack?: number | null, costPricePerPack?: number | null, comment?: string | null, location?: { __typename: 'LocationNode', id: string, name: string, code: string, onHold: boolean } | null, stockLine?: { __typename: 'StockLineNode', id: string } | null, item: { __typename: 'ItemNode', id: string, code: string, name: string, unitName?: string | null }, inventoryAdjustmentReason?: { __typename: 'InventoryAdjustmentReasonNode', id: string, reason: string } | null }> } };

export type StocktakesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  filter?: Types.InputMaybe<Types.StocktakeFilterInput>;
  page?: Types.InputMaybe<Types.PaginationInput>;
  sort?: Types.InputMaybe<Array<Types.StocktakeSortInput> | Types.StocktakeSortInput>;
}>;


export type StocktakesQuery = { __typename: 'Queries', stocktakes: { __typename: 'StocktakeConnector', totalCount: number, nodes: Array<{ __typename: 'StocktakeNode', id: string, comment?: string | null, description?: string | null, createdDatetime: string, finalisedDatetime?: string | null, stocktakeDate?: string | null, stocktakeNumber: number, status: Types.StocktakeNodeStatus, isLocked: boolean }> } };

export type StocktakeQueryVariables = Types.Exact<{
  stocktakeId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type StocktakeQuery = { __typename: 'Queries', stocktake: { __typename: 'NodeError' } | { __typename: 'StocktakeNode', id: string, stocktakeNumber: number, comment?: string | null, createdDatetime: string, finalisedDatetime?: string | null, stocktakeDate?: string | null, status: Types.StocktakeNodeStatus, description?: string | null, isLocked: boolean, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, lines: { __typename: 'StocktakeLineConnector', totalCount: number, nodes: Array<{ __typename: 'StocktakeLineNode', stocktakeId: string, batch?: string | null, itemId: string, itemName: string, id: string, expiryDate?: string | null, packSize?: number | null, snapshotNumberOfPacks: number, countedNumberOfPacks?: number | null, sellPricePerPack?: number | null, costPricePerPack?: number | null, comment?: string | null, location?: { __typename: 'LocationNode', id: string, name: string, code: string, onHold: boolean } | null, stockLine?: { __typename: 'StockLineNode', id: string } | null, item: { __typename: 'ItemNode', id: string, code: string, name: string, unitName?: string | null }, inventoryAdjustmentReason?: { __typename: 'InventoryAdjustmentReasonNode', id: string, reason: string } | null }> } } };

export type StocktakeByNumberQueryVariables = Types.Exact<{
  stocktakeNumber: Types.Scalars['Int']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type StocktakeByNumberQuery = { __typename: 'Queries', stocktakeByNumber: { __typename: 'NodeError' } | { __typename: 'StocktakeNode', id: string, stocktakeNumber: number, comment?: string | null, createdDatetime: string, finalisedDatetime?: string | null, stocktakeDate?: string | null, status: Types.StocktakeNodeStatus, description?: string | null, isLocked: boolean, user?: { __typename: 'UserNode', username: string, email?: string | null } | null, lines: { __typename: 'StocktakeLineConnector', totalCount: number, nodes: Array<{ __typename: 'StocktakeLineNode', stocktakeId: string, batch?: string | null, itemId: string, itemName: string, id: string, expiryDate?: string | null, packSize?: number | null, snapshotNumberOfPacks: number, countedNumberOfPacks?: number | null, sellPricePerPack?: number | null, costPricePerPack?: number | null, comment?: string | null, location?: { __typename: 'LocationNode', id: string, name: string, code: string, onHold: boolean } | null, stockLine?: { __typename: 'StockLineNode', id: string } | null, item: { __typename: 'ItemNode', id: string, code: string, name: string, unitName?: string | null }, inventoryAdjustmentReason?: { __typename: 'InventoryAdjustmentReasonNode', id: string, reason: string } | null }> } } };

export type StocktakeLinesQueryVariables = Types.Exact<{
  stocktakeId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
  page?: Types.InputMaybe<Types.PaginationInput>;
  sort?: Types.InputMaybe<Array<Types.StocktakeLineSortInput> | Types.StocktakeLineSortInput>;
  filter?: Types.InputMaybe<Types.StocktakeLineFilterInput>;
}>;


export type StocktakeLinesQuery = { __typename: 'Queries', stocktakeLines: { __typename: 'StocktakeLineConnector', totalCount: number, nodes: Array<{ __typename: 'StocktakeLineNode', stocktakeId: string, batch?: string | null, itemId: string, itemName: string, id: string, expiryDate?: string | null, packSize?: number | null, snapshotNumberOfPacks: number, countedNumberOfPacks?: number | null, sellPricePerPack?: number | null, costPricePerPack?: number | null, comment?: string | null, location?: { __typename: 'LocationNode', id: string, name: string, code: string, onHold: boolean } | null, stockLine?: { __typename: 'StockLineNode', id: string } | null, item: { __typename: 'ItemNode', id: string, code: string, name: string, unitName?: string | null }, inventoryAdjustmentReason?: { __typename: 'InventoryAdjustmentReasonNode', id: string, reason: string } | null }> } };

export type StockLineReducedBelowZeroErrorFragment = { __typename: 'StockLineReducedBelowZero', description: string, stockLine: { __typename: 'StockLineNode', id: string, totalNumberOfPacks: number, availableNumberOfPacks: number } };

export type AdjustmentReasonNotProvidedErrorFragment = { __typename: 'AdjustmentReasonNotProvided', description: string };

export type AdjustmentReasonNotValidErrorFragment = { __typename: 'AdjustmentReasonNotValid', description: string };

export type SnapshotCountCurrentCountMismatchLineErrorFragment = { __typename: 'SnapshotCountCurrentCountMismatchLine', description: string, stocktakeLine: { __typename: 'StocktakeLineNode', id: string } };

export type UpsertStocktakeLinesMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  deleteStocktakeLines?: Types.InputMaybe<Array<Types.DeleteStocktakeLineInput> | Types.DeleteStocktakeLineInput>;
  updateStocktakeLines?: Types.InputMaybe<Array<Types.UpdateStocktakeLineInput> | Types.UpdateStocktakeLineInput>;
  insertStocktakeLines?: Types.InputMaybe<Array<Types.InsertStocktakeLineInput> | Types.InsertStocktakeLineInput>;
}>;


export type UpsertStocktakeLinesMutation = { __typename: 'Mutations', batchStocktake: { __typename: 'BatchStocktakeResponse', deleteStocktakeLines?: Array<{ __typename: 'DeleteStocktakeLineResponseWithId', id: string, response: { __typename: 'DeleteResponse', id: string } | { __typename: 'DeleteStocktakeLineError', error: { __typename: 'CannotEditStocktake', description: string } } }> | null, insertStocktakeLines?: Array<{ __typename: 'InsertStocktakeLineResponseWithId', id: string, response: { __typename: 'InsertStocktakeLineError', error: { __typename: 'AdjustmentReasonNotProvided', description: string } | { __typename: 'AdjustmentReasonNotValid', description: string } | { __typename: 'CannotEditStocktake', description: string } | { __typename: 'StockLineReducedBelowZero', description: string, stockLine: { __typename: 'StockLineNode', id: string, totalNumberOfPacks: number, availableNumberOfPacks: number } } } | { __typename: 'StocktakeLineNode' } }> | null, updateStocktakeLines?: Array<{ __typename: 'UpdateStocktakeLineResponseWithId', id: string, response: { __typename: 'StocktakeLineNode' } | { __typename: 'UpdateStocktakeLineError', error: { __typename: 'AdjustmentReasonNotProvided', description: string } | { __typename: 'AdjustmentReasonNotValid', description: string } | { __typename: 'CannotEditStocktake', description: string } | { __typename: 'SnapshotCountCurrentCountMismatchLine', description: string, stocktakeLine: { __typename: 'StocktakeLineNode', id: string } } | { __typename: 'StockLineReducedBelowZero', description: string, stockLine: { __typename: 'StockLineNode', id: string, totalNumberOfPacks: number, availableNumberOfPacks: number } } } }> | null } };

export type DeleteStocktakesMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  ids?: Types.InputMaybe<Array<Types.DeleteStocktakeInput> | Types.DeleteStocktakeInput>;
}>;


export type DeleteStocktakesMutation = { __typename: 'Mutations', batchStocktake: { __typename: 'BatchStocktakeResponse', deleteStocktakes?: Array<{ __typename: 'DeleteStocktakeResponseWithId', id: string }> | null } };

export type StockLinesReducedBelowZeroErrorFragment = { __typename: 'StockLinesReducedBelowZero', description: string, errors: Array<{ __typename: 'StockLineReducedBelowZero', description: string, stockLine: { __typename: 'StockLineNode', id: string, totalNumberOfPacks: number, availableNumberOfPacks: number } }> };

export type SnapshotCountCurrentCountMismatchErrorFragment = { __typename: 'SnapshotCountCurrentCountMismatch', lines: Array<{ __typename: 'SnapshotCountCurrentCountMismatchLine', description: string, stocktakeLine: { __typename: 'StocktakeLineNode', id: string } }> };

export type UpdateStocktakeMutationVariables = Types.Exact<{
  input: Types.UpdateStocktakeInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type UpdateStocktakeMutation = { __typename: 'Mutations', updateStocktake: { __typename: 'StocktakeNode', id: string } | { __typename: 'UpdateStocktakeError', error: { __typename: 'CannotEditStocktake', description: string } | { __typename: 'SnapshotCountCurrentCountMismatch', description: string, lines: Array<{ __typename: 'SnapshotCountCurrentCountMismatchLine', description: string, stocktakeLine: { __typename: 'StocktakeLineNode', id: string } }> } | { __typename: 'StockLinesReducedBelowZero', description: string, errors: Array<{ __typename: 'StockLineReducedBelowZero', description: string, stockLine: { __typename: 'StockLineNode', id: string, totalNumberOfPacks: number, availableNumberOfPacks: number } }> } | { __typename: 'StocktakeIsLocked', description: string } } };

export type InsertStocktakeMutationVariables = Types.Exact<{
  input: Types.InsertStocktakeInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type InsertStocktakeMutation = { __typename: 'Mutations', insertStocktake: { __typename: 'StocktakeNode', id: string, stocktakeNumber: number } };

export const StocktakeRowFragmentDoc = gql`
    fragment StocktakeRow on StocktakeNode {
  __typename
  id
  comment
  description
  createdDatetime
  finalisedDatetime
  stocktakeDate
  stocktakeNumber
  status
  isLocked
}
    `;
export const StocktakeLineFragmentDoc = gql`
    fragment StocktakeLine on StocktakeLineNode {
  __typename
  stocktakeId
  batch
  itemId
  itemName
  id
  expiryDate
  packSize
  snapshotNumberOfPacks
  countedNumberOfPacks
  sellPricePerPack
  costPricePerPack
  comment
  location {
    __typename
    id
    name
    code
    onHold
  }
  stockLine {
    __typename
    id
  }
  item {
    __typename
    id
    code
    name
    unitName
  }
  inventoryAdjustmentReason {
    __typename
    id
    reason
  }
}
    `;
export const StocktakeFragmentDoc = gql`
    fragment Stocktake on StocktakeNode {
  __typename
  id
  stocktakeNumber
  comment
  createdDatetime
  finalisedDatetime
  stocktakeDate
  status
  description
  isLocked
  user {
    __typename
    username
    email
  }
  lines {
    __typename
    totalCount
    nodes {
      ...StocktakeLine
    }
  }
}
    ${StocktakeLineFragmentDoc}`;
export const AdjustmentReasonNotProvidedErrorFragmentDoc = gql`
    fragment AdjustmentReasonNotProvidedError on AdjustmentReasonNotProvided {
  __typename
  description
}
    `;
export const AdjustmentReasonNotValidErrorFragmentDoc = gql`
    fragment AdjustmentReasonNotValidError on AdjustmentReasonNotValid {
  __typename
  description
}
    `;
export const StockLineReducedBelowZeroErrorFragmentDoc = gql`
    fragment StockLineReducedBelowZeroError on StockLineReducedBelowZero {
  __typename
  stockLine {
    id
    totalNumberOfPacks
    availableNumberOfPacks
  }
  description
}
    `;
export const StockLinesReducedBelowZeroErrorFragmentDoc = gql`
    fragment StockLinesReducedBelowZeroError on StockLinesReducedBelowZero {
  __typename
  errors {
    ...StockLineReducedBelowZeroError
  }
  description
}
    ${StockLineReducedBelowZeroErrorFragmentDoc}`;
export const SnapshotCountCurrentCountMismatchLineErrorFragmentDoc = gql`
    fragment SnapshotCountCurrentCountMismatchLineError on SnapshotCountCurrentCountMismatchLine {
  __typename
  stocktakeLine {
    id
  }
  description
}
    `;
export const SnapshotCountCurrentCountMismatchErrorFragmentDoc = gql`
    fragment SnapshotCountCurrentCountMismatchError on SnapshotCountCurrentCountMismatch {
  __typename
  lines {
    ...SnapshotCountCurrentCountMismatchLineError
  }
}
    ${SnapshotCountCurrentCountMismatchLineErrorFragmentDoc}`;
export const StocktakesDocument = gql`
    query stocktakes($storeId: String!, $filter: StocktakeFilterInput, $page: PaginationInput, $sort: [StocktakeSortInput!]) {
  stocktakes(storeId: $storeId, filter: $filter, page: $page, sort: $sort) {
    __typename
    ... on StocktakeConnector {
      __typename
      totalCount
      nodes {
        ...StocktakeRow
      }
    }
  }
}
    ${StocktakeRowFragmentDoc}`;
export const StocktakeDocument = gql`
    query stocktake($stocktakeId: String!, $storeId: String!) {
  stocktake(id: $stocktakeId, storeId: $storeId) {
    __typename
    ... on StocktakeNode {
      ...Stocktake
    }
  }
}
    ${StocktakeFragmentDoc}`;
export const StocktakeByNumberDocument = gql`
    query stocktakeByNumber($stocktakeNumber: Int!, $storeId: String!) {
  stocktakeByNumber(stocktakeNumber: $stocktakeNumber, storeId: $storeId) {
    __typename
    ... on StocktakeNode {
      ...Stocktake
    }
  }
}
    ${StocktakeFragmentDoc}`;
export const StocktakeLinesDocument = gql`
    query stocktakeLines($stocktakeId: String!, $storeId: String!, $page: PaginationInput, $sort: [StocktakeLineSortInput!], $filter: StocktakeLineFilterInput) {
  stocktakeLines(
    stocktakeId: $stocktakeId
    storeId: $storeId
    page: $page
    sort: $sort
    filter: $filter
  ) {
    ... on StocktakeLineConnector {
      __typename
      totalCount
      nodes {
        ...StocktakeLine
      }
    }
  }
}
    ${StocktakeLineFragmentDoc}`;
export const UpsertStocktakeLinesDocument = gql`
    mutation upsertStocktakeLines($storeId: String!, $deleteStocktakeLines: [DeleteStocktakeLineInput!], $updateStocktakeLines: [UpdateStocktakeLineInput!], $insertStocktakeLines: [InsertStocktakeLineInput!]) {
  batchStocktake(
    storeId: $storeId
    input: {deleteStocktakeLines: $deleteStocktakeLines, updateStocktakeLines: $updateStocktakeLines, insertStocktakeLines: $insertStocktakeLines}
  ) {
    __typename
    ... on BatchStocktakeResponse {
      __typename
      deleteStocktakeLines {
        __typename
        id
        response {
          ... on DeleteStocktakeLineError {
            __typename
            error {
              description
              ... on CannotEditStocktake {
                __typename
                description
              }
            }
          }
          ... on DeleteResponse {
            __typename
            id
          }
        }
      }
      insertStocktakeLines {
        __typename
        id
        response {
          __typename
          ... on InsertStocktakeLineError {
            error {
              __typename
              description
              ...StockLineReducedBelowZeroError
              ...AdjustmentReasonNotProvidedError
              ...AdjustmentReasonNotValidError
            }
          }
        }
      }
      updateStocktakeLines {
        __typename
        id
        response {
          __typename
          ... on UpdateStocktakeLineError {
            error {
              __typename
              description
              ...StockLineReducedBelowZeroError
              ...AdjustmentReasonNotProvidedError
              ...AdjustmentReasonNotValidError
              ...SnapshotCountCurrentCountMismatchLineError
            }
          }
        }
      }
    }
  }
}
    ${StockLineReducedBelowZeroErrorFragmentDoc}
${AdjustmentReasonNotProvidedErrorFragmentDoc}
${AdjustmentReasonNotValidErrorFragmentDoc}
${SnapshotCountCurrentCountMismatchLineErrorFragmentDoc}`;
export const DeleteStocktakesDocument = gql`
    mutation deleteStocktakes($storeId: String!, $ids: [DeleteStocktakeInput!]) {
  batchStocktake(storeId: $storeId, input: {deleteStocktakes: $ids}) {
    __typename
    ... on BatchStocktakeResponse {
      deleteStocktakes {
        __typename
        id
      }
    }
  }
}
    `;
export const UpdateStocktakeDocument = gql`
    mutation updateStocktake($input: UpdateStocktakeInput!, $storeId: String!) {
  updateStocktake(input: $input, storeId: $storeId) {
    __typename
    ... on UpdateStocktakeError {
      error {
        __typename
        description
        ... on StockLinesReducedBelowZero {
          ...StockLinesReducedBelowZeroError
        }
        ... on SnapshotCountCurrentCountMismatch {
          ...SnapshotCountCurrentCountMismatchError
        }
      }
    }
    ... on StocktakeNode {
      id
    }
  }
}
    ${StockLinesReducedBelowZeroErrorFragmentDoc}
${SnapshotCountCurrentCountMismatchErrorFragmentDoc}`;
export const InsertStocktakeDocument = gql`
    mutation insertStocktake($input: InsertStocktakeInput!, $storeId: String!) {
  insertStocktake(input: $input, storeId: $storeId) {
    ... on StocktakeNode {
      __typename
      id
      stocktakeNumber
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    stocktakes(variables: StocktakesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<StocktakesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<StocktakesQuery>(StocktakesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'stocktakes', 'query', variables);
    },
    stocktake(variables: StocktakeQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<StocktakeQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<StocktakeQuery>(StocktakeDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'stocktake', 'query', variables);
    },
    stocktakeByNumber(variables: StocktakeByNumberQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<StocktakeByNumberQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<StocktakeByNumberQuery>(StocktakeByNumberDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'stocktakeByNumber', 'query', variables);
    },
    stocktakeLines(variables: StocktakeLinesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<StocktakeLinesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<StocktakeLinesQuery>(StocktakeLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'stocktakeLines', 'query', variables);
    },
    upsertStocktakeLines(variables: UpsertStocktakeLinesMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpsertStocktakeLinesMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpsertStocktakeLinesMutation>(UpsertStocktakeLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'upsertStocktakeLines', 'mutation', variables);
    },
    deleteStocktakes(variables: DeleteStocktakesMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteStocktakesMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteStocktakesMutation>(DeleteStocktakesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteStocktakes', 'mutation', variables);
    },
    updateStocktake(variables: UpdateStocktakeMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateStocktakeMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateStocktakeMutation>(UpdateStocktakeDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateStocktake', 'mutation', variables);
    },
    insertStocktake(variables: InsertStocktakeMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertStocktakeMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertStocktakeMutation>(InsertStocktakeDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertStocktake', 'mutation', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;