import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type AssetRowFragment = { __typename: 'AssetNode', assetNumber?: string | null, id: string, notes?: string | null, serialNumber?: string | null, modifiedDatetime: any, installationDate?: string | null, createdDatetime: any, replacementDate?: string | null, storeId?: string | null, statusLog?: { __typename: 'AssetLogNode', logDatetime: any, status?: Types.StatusType | null, reason?: { __typename: 'AssetLogReasonNode', reason: string } | null } | null, store?: { __typename: 'StoreNode', id: string, code: string, storeName: string } | null, catalogueItem?: { __typename: 'AssetCatalogueItemNode', manufacturer?: string | null, model: string } | null, assetType?: { __typename: 'AssetTypeNode', name: string } | null };

export type AssetFragment = { __typename: 'AssetNode', catalogueItemId?: string | null, assetNumber?: string | null, createdDatetime: any, id: string, installationDate?: string | null, properties: string, catalogProperties?: string | null, modifiedDatetime: any, notes?: string | null, replacementDate?: string | null, serialNumber?: string | null, storeId?: string | null, donorNameId?: string | null, warrantyStart?: string | null, warrantyEnd?: string | null, documents: { __typename: 'SyncFileReferenceConnector', nodes: Array<{ __typename: 'SyncFileReferenceNode', fileName: string, id: string, mimeType?: string | null }> }, locations: { __typename: 'LocationConnector', totalCount: number, nodes: Array<{ __typename: 'LocationNode', id: string, code: string, name: string, onHold: boolean }> }, statusLog?: { __typename: 'AssetLogNode', logDatetime: any, status?: Types.StatusType | null, reason?: { __typename: 'AssetLogReasonNode', reason: string } | null } | null, store?: { __typename: 'StoreNode', id: string, code: string, storeName: string } | null, catalogueItem?: { __typename: 'AssetCatalogueItemNode', manufacturer?: string | null, model: string } | null, assetType?: { __typename: 'AssetTypeNode', id: string, name: string } | null, assetClass?: { __typename: 'AssetClassNode', id: string, name: string } | null, assetCategory?: { __typename: 'AssetCategoryNode', id: string, name: string } | null, donor?: { __typename: 'NameNode', id: string, name: string } | null };

export type ColdchainAssetLogFragment = { __typename: 'AssetLogNode', comment?: string | null, id: string, logDatetime: any, status?: Types.StatusType | null, type?: string | null, reason?: { __typename: 'AssetLogReasonNode', reason: string } | null, user?: { __typename: 'UserNode', firstName?: string | null, lastName?: string | null, username: string, jobTitle?: string | null } | null, documents: { __typename: 'SyncFileReferenceConnector', nodes: Array<{ __typename: 'SyncFileReferenceNode', fileName: string, id: string, mimeType?: string | null }> } };

export type AssetsQueryVariables = Types.Exact<{
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter: Types.AssetFilterInput;
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.AssetSortFieldInput;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  storeId: Types.Scalars['String']['input'];
}>;


export type AssetsQuery = { __typename: 'Queries', assets: { __typename: 'AssetConnector', totalCount: number, nodes: Array<{ __typename: 'AssetNode', assetNumber?: string | null, id: string, notes?: string | null, serialNumber?: string | null, modifiedDatetime: any, installationDate?: string | null, createdDatetime: any, replacementDate?: string | null, storeId?: string | null, statusLog?: { __typename: 'AssetLogNode', logDatetime: any, status?: Types.StatusType | null, reason?: { __typename: 'AssetLogReasonNode', reason: string } | null } | null, store?: { __typename: 'StoreNode', id: string, code: string, storeName: string } | null, catalogueItem?: { __typename: 'AssetCatalogueItemNode', manufacturer?: string | null, model: string } | null, assetType?: { __typename: 'AssetTypeNode', name: string } | null }> } };

export type AssetByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  assetId: Types.Scalars['String']['input'];
}>;


export type AssetByIdQuery = { __typename: 'Queries', assets: { __typename: 'AssetConnector', totalCount: number, nodes: Array<{ __typename: 'AssetNode', catalogueItemId?: string | null, assetNumber?: string | null, createdDatetime: any, id: string, installationDate?: string | null, properties: string, catalogProperties?: string | null, modifiedDatetime: any, notes?: string | null, replacementDate?: string | null, serialNumber?: string | null, storeId?: string | null, donorNameId?: string | null, warrantyStart?: string | null, warrantyEnd?: string | null, documents: { __typename: 'SyncFileReferenceConnector', nodes: Array<{ __typename: 'SyncFileReferenceNode', fileName: string, id: string, mimeType?: string | null }> }, locations: { __typename: 'LocationConnector', totalCount: number, nodes: Array<{ __typename: 'LocationNode', id: string, code: string, name: string, onHold: boolean }> }, statusLog?: { __typename: 'AssetLogNode', logDatetime: any, status?: Types.StatusType | null, reason?: { __typename: 'AssetLogReasonNode', reason: string } | null } | null, store?: { __typename: 'StoreNode', id: string, code: string, storeName: string } | null, catalogueItem?: { __typename: 'AssetCatalogueItemNode', manufacturer?: string | null, model: string } | null, assetType?: { __typename: 'AssetTypeNode', id: string, name: string } | null, assetClass?: { __typename: 'AssetClassNode', id: string, name: string } | null, assetCategory?: { __typename: 'AssetCategoryNode', id: string, name: string } | null, donor?: { __typename: 'NameNode', id: string, name: string } | null }> } };

export type AssetLogsQueryVariables = Types.Exact<{
  filter: Types.AssetLogFilterInput;
  sort?: Types.InputMaybe<Types.AssetLogSortInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type AssetLogsQuery = { __typename: 'Queries', assetLogs: { __typename: 'AssetLogConnector', totalCount: number, nodes: Array<{ __typename: 'AssetLogNode', comment?: string | null, id: string, logDatetime: any, status?: Types.StatusType | null, type?: string | null, reason?: { __typename: 'AssetLogReasonNode', reason: string } | null, user?: { __typename: 'UserNode', firstName?: string | null, lastName?: string | null, username: string, jobTitle?: string | null } | null, documents: { __typename: 'SyncFileReferenceConnector', nodes: Array<{ __typename: 'SyncFileReferenceNode', fileName: string, id: string, mimeType?: string | null }> } }> } };

export type LabelPrinterSettingsQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type LabelPrinterSettingsQuery = { __typename: 'Queries', labelPrinterSettings?: { __typename: 'LabelPrinterSettingNode', address: string, labelHeight: number, labelWidth: number, port: number } | null };

export type DeleteAssetMutationVariables = Types.Exact<{
  assetId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type DeleteAssetMutation = { __typename: 'Mutations', deleteAsset: { __typename: 'DeleteAssetError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'RecordBelongsToAnotherStore', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } };

export type InsertAssetMutationVariables = Types.Exact<{
  input: Types.InsertAssetInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type InsertAssetMutation = { __typename: 'Mutations', insertAsset: { __typename: 'AssetNode', id: string } | { __typename: 'InsertAssetError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'InternalError', description: string } | { __typename: 'NoPermissionForThisStore', description: string } | { __typename: 'RecordAlreadyExist', description: string } | { __typename: 'UniqueValueViolation', description: string } } };

export type UpdateAssetMutationVariables = Types.Exact<{
  input: Types.UpdateAssetInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type UpdateAssetMutation = { __typename: 'Mutations', updateAsset: { __typename: 'AssetNode', id: string } | { __typename: 'UpdateAssetError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'InternalError', description: string } | { __typename: 'RecordBelongsToAnotherStore', description: string } | { __typename: 'RecordNotFound', description: string } | { __typename: 'UniqueValueViolation', description: string } } };

export type InsertAssetLogMutationVariables = Types.Exact<{
  input: Types.InsertAssetLogInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type InsertAssetLogMutation = { __typename: 'Mutations', insertAssetLog: { __typename: 'AssetLogNode', id: string, assetId: string } | { __typename: 'InsertAssetLogError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'InternalError', description: string } | { __typename: 'RecordAlreadyExist', description: string } | { __typename: 'UniqueValueViolation', description: string } } };

export type AssetPropertyRowFragment = { __typename: 'AssetPropertyNode', id: string, key: string, name: string, valueType: Types.PropertyNodeValueType, allowedValues?: string | null };

export type AssetPropertiesQueryVariables = Types.Exact<{
  filter: Types.AssetPropertyFilterInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type AssetPropertiesQuery = { __typename: 'Queries', assetProperties: { __typename: 'AssetPropertyConnector', totalCount: number, nodes: Array<{ __typename: 'AssetPropertyNode', id: string, key: string, name: string, valueType: Types.PropertyNodeValueType, allowedValues?: string | null }> } };

export const AssetRowFragmentDoc = gql`
    fragment AssetRow on AssetNode {
  __typename
  assetNumber
  id
  notes
  serialNumber
  modifiedDatetime
  installationDate
  createdDatetime
  replacementDate
  statusLog {
    logDatetime
    reason {
      reason
    }
    status
  }
  storeId
  store {
    id
    code
    storeName
  }
  catalogueItem {
    manufacturer
    model
  }
  assetType {
    name
  }
}
    `;
export const AssetFragmentDoc = gql`
    fragment Asset on AssetNode {
  __typename
  catalogueItemId
  assetNumber
  createdDatetime
  id
  installationDate
  documents {
    nodes {
      fileName
      id
      mimeType
    }
  }
  locations {
    nodes {
      id
      code
      name
      onHold
    }
    totalCount
  }
  properties
  catalogProperties
  modifiedDatetime
  notes
  replacementDate
  serialNumber
  statusLog {
    logDatetime
    reason {
      reason
    }
    status
  }
  storeId
  store {
    id
    code
    storeName
  }
  catalogueItem {
    manufacturer
    model
  }
  assetType {
    id
    name
  }
  assetClass {
    id
    name
  }
  assetCategory {
    id
    name
  }
  donorNameId
  donor(storeId: $storeId) {
    id
    name
  }
  warrantyStart
  warrantyEnd
}
    `;
export const ColdchainAssetLogFragmentDoc = gql`
    fragment ColdchainAssetLog on AssetLogNode {
  comment
  id
  logDatetime
  reason {
    reason
  }
  status
  type
  user {
    firstName
    lastName
    username
    jobTitle
  }
  documents {
    nodes {
      fileName
      id
      mimeType
    }
  }
}
    `;
export const AssetPropertyRowFragmentDoc = gql`
    fragment AssetPropertyRow on AssetPropertyNode {
  id
  key
  name
  valueType
  allowedValues
}
    `;
export const AssetsDocument = gql`
    query assets($desc: Boolean, $filter: AssetFilterInput!, $first: Int, $key: AssetSortFieldInput!, $offset: Int, $storeId: String!) {
  assets(
    filter: $filter
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    storeId: $storeId
  ) {
    ... on AssetConnector {
      nodes {
        ...AssetRow
      }
      totalCount
    }
  }
}
    ${AssetRowFragmentDoc}`;
export const AssetByIdDocument = gql`
    query assetById($storeId: String!, $assetId: String!) {
  assets(storeId: $storeId, filter: {id: {equalTo: $assetId}}) {
    ... on AssetConnector {
      __typename
      nodes {
        __typename
        ...Asset
      }
      totalCount
    }
  }
}
    ${AssetFragmentDoc}`;
export const AssetLogsDocument = gql`
    query assetLogs($filter: AssetLogFilterInput!, $sort: AssetLogSortInput, $storeId: String!) {
  assetLogs(filter: $filter, sort: $sort, storeId: $storeId) {
    ... on AssetLogConnector {
      __typename
      totalCount
      nodes {
        __typename
        ...ColdchainAssetLog
      }
    }
  }
}
    ${ColdchainAssetLogFragmentDoc}`;
export const LabelPrinterSettingsDocument = gql`
    query labelPrinterSettings {
  labelPrinterSettings {
    __typename
    address
    labelHeight
    labelWidth
    port
  }
}
    `;
export const DeleteAssetDocument = gql`
    mutation deleteAsset($assetId: String!, $storeId: String!) {
  deleteAsset(assetId: $assetId, storeId: $storeId) {
    ... on DeleteResponse {
      __typename
      id
    }
    ... on DeleteAssetError {
      __typename
      error {
        description
      }
    }
  }
}
    `;
export const InsertAssetDocument = gql`
    mutation insertAsset($input: InsertAssetInput!, $storeId: String!) {
  insertAsset(input: $input, storeId: $storeId) {
    ... on InsertAssetError {
      __typename
      error {
        description
      }
    }
    ... on AssetNode {
      __typename
      id
    }
  }
}
    `;
export const UpdateAssetDocument = gql`
    mutation updateAsset($input: UpdateAssetInput!, $storeId: String!) {
  updateAsset(input: $input, storeId: $storeId) {
    ... on UpdateAssetError {
      __typename
      error {
        description
      }
    }
    ... on AssetNode {
      __typename
      id
    }
  }
}
    `;
export const InsertAssetLogDocument = gql`
    mutation insertAssetLog($input: InsertAssetLogInput!, $storeId: String!) {
  insertAssetLog(input: $input, storeId: $storeId) {
    ... on AssetLogNode {
      __typename
      id
      assetId
    }
    ... on InsertAssetLogError {
      __typename
      error {
        description
      }
    }
  }
}
    `;
export const AssetPropertiesDocument = gql`
    query assetProperties($filter: AssetPropertyFilterInput!, $storeId: String!) {
  assetProperties(filter: $filter, storeId: $storeId) {
    ... on AssetPropertyConnector {
      __typename
      totalCount
      nodes {
        __typename
        ...AssetPropertyRow
      }
    }
  }
}
    ${AssetPropertyRowFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    assets(variables: AssetsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AssetsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AssetsQuery>(AssetsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'assets', 'query');
    },
    assetById(variables: AssetByIdQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AssetByIdQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AssetByIdQuery>(AssetByIdDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'assetById', 'query');
    },
    assetLogs(variables: AssetLogsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AssetLogsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AssetLogsQuery>(AssetLogsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'assetLogs', 'query');
    },
    labelPrinterSettings(variables?: LabelPrinterSettingsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<LabelPrinterSettingsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<LabelPrinterSettingsQuery>(LabelPrinterSettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'labelPrinterSettings', 'query');
    },
    deleteAsset(variables: DeleteAssetMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteAssetMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteAssetMutation>(DeleteAssetDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteAsset', 'mutation');
    },
    insertAsset(variables: InsertAssetMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertAssetMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertAssetMutation>(InsertAssetDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertAsset', 'mutation');
    },
    updateAsset(variables: UpdateAssetMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateAssetMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateAssetMutation>(UpdateAssetDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateAsset', 'mutation');
    },
    insertAssetLog(variables: InsertAssetLogMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertAssetLogMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertAssetLogMutation>(InsertAssetLogDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertAssetLog', 'mutation');
    },
    assetProperties(variables: AssetPropertiesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AssetPropertiesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AssetPropertiesQuery>(AssetPropertiesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'assetProperties', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockAssetsQuery((req, res, ctx) => {
 *   const { desc, filter, first, key, offset, storeId } = req.variables;
 *   return res(
 *     ctx.data({ assets })
 *   )
 * })
 */
export const mockAssetsQuery = (resolver: ResponseResolver<GraphQLRequest<AssetsQueryVariables>, GraphQLContext<AssetsQuery>, any>) =>
  graphql.query<AssetsQuery, AssetsQueryVariables>(
    'assets',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockAssetByIdQuery((req, res, ctx) => {
 *   const { storeId, assetId } = req.variables;
 *   return res(
 *     ctx.data({ assets })
 *   )
 * })
 */
export const mockAssetByIdQuery = (resolver: ResponseResolver<GraphQLRequest<AssetByIdQueryVariables>, GraphQLContext<AssetByIdQuery>, any>) =>
  graphql.query<AssetByIdQuery, AssetByIdQueryVariables>(
    'assetById',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockAssetLogsQuery((req, res, ctx) => {
 *   const { filter, sort, storeId } = req.variables;
 *   return res(
 *     ctx.data({ assetLogs })
 *   )
 * })
 */
export const mockAssetLogsQuery = (resolver: ResponseResolver<GraphQLRequest<AssetLogsQueryVariables>, GraphQLContext<AssetLogsQuery>, any>) =>
  graphql.query<AssetLogsQuery, AssetLogsQueryVariables>(
    'assetLogs',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockLabelPrinterSettingsQuery((req, res, ctx) => {
 *   return res(
 *     ctx.data({ labelPrinterSettings })
 *   )
 * })
 */
export const mockLabelPrinterSettingsQuery = (resolver: ResponseResolver<GraphQLRequest<LabelPrinterSettingsQueryVariables>, GraphQLContext<LabelPrinterSettingsQuery>, any>) =>
  graphql.query<LabelPrinterSettingsQuery, LabelPrinterSettingsQueryVariables>(
    'labelPrinterSettings',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeleteAssetMutation((req, res, ctx) => {
 *   const { assetId, storeId } = req.variables;
 *   return res(
 *     ctx.data({ deleteAsset })
 *   )
 * })
 */
export const mockDeleteAssetMutation = (resolver: ResponseResolver<GraphQLRequest<DeleteAssetMutationVariables>, GraphQLContext<DeleteAssetMutation>, any>) =>
  graphql.mutation<DeleteAssetMutation, DeleteAssetMutationVariables>(
    'deleteAsset',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertAssetMutation((req, res, ctx) => {
 *   const { input, storeId } = req.variables;
 *   return res(
 *     ctx.data({ insertAsset })
 *   )
 * })
 */
export const mockInsertAssetMutation = (resolver: ResponseResolver<GraphQLRequest<InsertAssetMutationVariables>, GraphQLContext<InsertAssetMutation>, any>) =>
  graphql.mutation<InsertAssetMutation, InsertAssetMutationVariables>(
    'insertAsset',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateAssetMutation((req, res, ctx) => {
 *   const { input, storeId } = req.variables;
 *   return res(
 *     ctx.data({ updateAsset })
 *   )
 * })
 */
export const mockUpdateAssetMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateAssetMutationVariables>, GraphQLContext<UpdateAssetMutation>, any>) =>
  graphql.mutation<UpdateAssetMutation, UpdateAssetMutationVariables>(
    'updateAsset',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertAssetLogMutation((req, res, ctx) => {
 *   const { input, storeId } = req.variables;
 *   return res(
 *     ctx.data({ insertAssetLog })
 *   )
 * })
 */
export const mockInsertAssetLogMutation = (resolver: ResponseResolver<GraphQLRequest<InsertAssetLogMutationVariables>, GraphQLContext<InsertAssetLogMutation>, any>) =>
  graphql.mutation<InsertAssetLogMutation, InsertAssetLogMutationVariables>(
    'insertAssetLog',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockAssetPropertiesQuery((req, res, ctx) => {
 *   const { filter, storeId } = req.variables;
 *   return res(
 *     ctx.data({ assetProperties })
 *   )
 * })
 */
export const mockAssetPropertiesQuery = (resolver: ResponseResolver<GraphQLRequest<AssetPropertiesQueryVariables>, GraphQLContext<AssetPropertiesQuery>, any>) =>
  graphql.query<AssetPropertiesQuery, AssetPropertiesQueryVariables>(
    'assetProperties',
    resolver
  )
