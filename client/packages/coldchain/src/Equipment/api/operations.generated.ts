import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type AssetRowFragment = { __typename: 'AssetNode', assetNumber?: string | null, id: string, notes?: string | null, serialNumber?: string | null, modifiedDatetime: any, installationDate?: string | null, createdDatetime: any, replacementDate?: string | null, storeId?: string | null, properties: string, catalogProperties?: string | null, statusLog?: { __typename: 'AssetLogNode', logDatetime: any, status?: Types.StatusType | null, reason?: { __typename: 'AssetLogReasonNode', reason: string } | null } | null, store?: { __typename: 'StoreNode', id: string, code: string, storeName: string } | null, catalogueItem?: { __typename: 'AssetCatalogueItemNode', manufacturer?: string | null, model: string, code: string } | null, assetType?: { __typename: 'AssetTypeNode', name: string } | null };

export type AssetFragment = { __typename: 'AssetNode', catalogueItemId?: string | null, assetNumber?: string | null, createdDatetime: any, id: string, installationDate?: string | null, properties: string, catalogProperties?: string | null, modifiedDatetime: any, notes?: string | null, replacementDate?: string | null, serialNumber?: string | null, storeId?: string | null, donorNameId?: string | null, warrantyStart?: string | null, warrantyEnd?: string | null, needsReplacement?: boolean | null, documents: { __typename: 'SyncFileReferenceConnector', nodes: Array<{ __typename: 'SyncFileReferenceNode', fileName: string, id: string, mimeType?: string | null }> }, locations: { __typename: 'LocationConnector', totalCount: number, nodes: Array<{ __typename: 'LocationNode', id: string, code: string, name: string, onHold: boolean }> }, statusLog?: { __typename: 'AssetLogNode', logDatetime: any, status?: Types.StatusType | null, reason?: { __typename: 'AssetLogReasonNode', reason: string } | null } | null, store?: { __typename: 'StoreNode', id: string, code: string, storeName: string } | null, catalogueItem?: { __typename: 'AssetCatalogueItemNode', manufacturer?: string | null, model: string } | null, assetType?: { __typename: 'AssetTypeNode', id: string, name: string } | null, assetClass?: { __typename: 'AssetClassNode', id: string, name: string } | null, assetCategory?: { __typename: 'AssetCategoryNode', id: string, name: string } | null, donor?: { __typename: 'NameNode', id: string, name: string } | null };

export type ColdchainAssetLogFragment = { __typename: 'AssetLogNode', comment?: string | null, id: string, logDatetime: any, status?: Types.StatusType | null, type?: string | null, reason?: { __typename: 'AssetLogReasonNode', reason: string } | null, user?: { __typename: 'UserNode', firstName?: string | null, lastName?: string | null, username: string, jobTitle?: string | null } | null, documents: { __typename: 'SyncFileReferenceConnector', nodes: Array<{ __typename: 'SyncFileReferenceNode', fileName: string, id: string, mimeType?: string | null }> } };

export type AssetsQueryVariables = Types.Exact<{
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter: Types.AssetFilterInput;
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.AssetSortFieldInput;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  storeId: Types.Scalars['String']['input'];
}>;


export type AssetsQuery = { __typename: 'Queries', assets: { __typename: 'AssetConnector', totalCount: number, nodes: Array<{ __typename: 'AssetNode', assetNumber?: string | null, id: string, notes?: string | null, serialNumber?: string | null, modifiedDatetime: any, installationDate?: string | null, createdDatetime: any, replacementDate?: string | null, storeId?: string | null, properties: string, catalogProperties?: string | null, statusLog?: { __typename: 'AssetLogNode', logDatetime: any, status?: Types.StatusType | null, reason?: { __typename: 'AssetLogReasonNode', reason: string } | null } | null, store?: { __typename: 'StoreNode', id: string, code: string, storeName: string } | null, catalogueItem?: { __typename: 'AssetCatalogueItemNode', manufacturer?: string | null, model: string, code: string } | null, assetType?: { __typename: 'AssetTypeNode', name: string } | null }> } };

export type AssetByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  assetId: Types.Scalars['String']['input'];
}>;


export type AssetByIdQuery = { __typename: 'Queries', assets: { __typename: 'AssetConnector', totalCount: number, nodes: Array<{ __typename: 'AssetNode', catalogueItemId?: string | null, assetNumber?: string | null, createdDatetime: any, id: string, installationDate?: string | null, properties: string, catalogProperties?: string | null, modifiedDatetime: any, notes?: string | null, replacementDate?: string | null, serialNumber?: string | null, storeId?: string | null, donorNameId?: string | null, warrantyStart?: string | null, warrantyEnd?: string | null, needsReplacement?: boolean | null, documents: { __typename: 'SyncFileReferenceConnector', nodes: Array<{ __typename: 'SyncFileReferenceNode', fileName: string, id: string, mimeType?: string | null }> }, locations: { __typename: 'LocationConnector', totalCount: number, nodes: Array<{ __typename: 'LocationNode', id: string, code: string, name: string, onHold: boolean }> }, statusLog?: { __typename: 'AssetLogNode', logDatetime: any, status?: Types.StatusType | null, reason?: { __typename: 'AssetLogReasonNode', reason: string } | null } | null, store?: { __typename: 'StoreNode', id: string, code: string, storeName: string } | null, catalogueItem?: { __typename: 'AssetCatalogueItemNode', manufacturer?: string | null, model: string } | null, assetType?: { __typename: 'AssetTypeNode', id: string, name: string } | null, assetClass?: { __typename: 'AssetClassNode', id: string, name: string } | null, assetCategory?: { __typename: 'AssetCategoryNode', id: string, name: string } | null, donor?: { __typename: 'NameNode', id: string, name: string } | null }> } };

export type AssetLogsQueryVariables = Types.Exact<{
  filter: Types.AssetLogFilterInput;
  sort?: Types.InputMaybe<Array<Types.AssetLogSortInput> | Types.AssetLogSortInput>;
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
    code
  }
  assetType {
    name
  }
  properties
  catalogProperties
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
  needsReplacement
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
    query assetLogs($filter: AssetLogFilterInput!, $sort: [AssetLogSortInput!], $storeId: String!) {
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

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    assets(variables: AssetsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AssetsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AssetsQuery>(AssetsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'assets', 'query', variables);
    },
    assetById(variables: AssetByIdQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AssetByIdQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AssetByIdQuery>(AssetByIdDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'assetById', 'query', variables);
    },
    assetLogs(variables: AssetLogsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AssetLogsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AssetLogsQuery>(AssetLogsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'assetLogs', 'query', variables);
    },
    labelPrinterSettings(variables?: LabelPrinterSettingsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<LabelPrinterSettingsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<LabelPrinterSettingsQuery>(LabelPrinterSettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'labelPrinterSettings', 'query', variables);
    },
    deleteAsset(variables: DeleteAssetMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteAssetMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteAssetMutation>(DeleteAssetDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteAsset', 'mutation', variables);
    },
    insertAsset(variables: InsertAssetMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertAssetMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertAssetMutation>(InsertAssetDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertAsset', 'mutation', variables);
    },
    updateAsset(variables: UpdateAssetMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateAssetMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateAssetMutation>(UpdateAssetDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateAsset', 'mutation', variables);
    },
    insertAssetLog(variables: InsertAssetLogMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertAssetLogMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertAssetLogMutation>(InsertAssetLogDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertAssetLog', 'mutation', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;