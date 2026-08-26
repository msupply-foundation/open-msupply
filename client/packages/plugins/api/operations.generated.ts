import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type PluginDataQueryVariables = Types.Exact<{
  pluginCode: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
  filter?: Types.InputMaybe<Types.PluginDataFilterInput>;
}>;

export type PluginDataQuery = {
  __typename: 'Queries';
  pluginData: {
    __typename: 'PluginDataConnector';
    nodes: Array<{
      __typename: 'PluginDataNode';
      id: string;
      data: string;
      relatedRecordId?: string | null;
    }>;
  };
};

export type InsertPluginDataMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertPluginDataInput;
}>;

export type InsertPluginDataMutation = {
  __typename: 'Mutations';
  insertPluginData: { __typename: 'PluginDataNode'; id: string };
};

export type UpdatePluginDataMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdatePluginDataInput;
}>;

export type UpdatePluginDataMutation = {
  __typename: 'Mutations';
  updatePluginData: { __typename: 'PluginDataNode'; id: string };
};

export const PluginDataDocument = gql`
  query pluginData(
    $pluginCode: String!
    $storeId: String!
    $filter: PluginDataFilterInput
  ) {
    pluginData(pluginCode: $pluginCode, storeId: $storeId, filter: $filter) {
      __typename
      ... on PluginDataConnector {
        nodes {
          id
          data
          relatedRecordId
        }
      }
    }
  }
`;
export const InsertPluginDataDocument = gql`
  mutation insertPluginData($storeId: String!, $input: InsertPluginDataInput!) {
    insertPluginData(input: $input, storeId: $storeId) {
      ... on PluginDataNode {
        __typename
        id
      }
    }
  }
`;
export const UpdatePluginDataDocument = gql`
  mutation updatePluginData($storeId: String!, $input: UpdatePluginDataInput!) {
    updatePluginData(input: $input, storeId: $storeId) {
      ... on PluginDataNode {
        __typename
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
    pluginData(
      variables: PluginDataQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<PluginDataQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PluginDataQuery>({
            document: PluginDataDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'pluginData',
        'query',
        variables
      );
    },
    insertPluginData(
      variables: InsertPluginDataMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<InsertPluginDataMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertPluginDataMutation>({
            document: InsertPluginDataDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'insertPluginData',
        'mutation',
        variables
      );
    },
    updatePluginData(
      variables: UpdatePluginDataMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<UpdatePluginDataMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdatePluginDataMutation>({
            document: UpdatePluginDataDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updatePluginData',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
