import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type InstalledPluginNodeFragment = {
  __typename: 'InstalledPluginNode';
  id: string;
  code: string;
  version: string;
  kind: Types.InstalledPluginKindType;
  types: Array<string>;
  hostRuntime?: string | null;
};

export type InstalledPluginsQueryVariables = Types.Exact<{
  [key: string]: never;
}>;

export type InstalledPluginsQuery = {
  __typename: 'Queries';
  centralServer: {
    __typename: 'CentralServerQueryNode';
    plugin: {
      __typename: 'CentralPluginQueries';
      installedPlugins: {
        __typename: 'InstalledPluginConnector';
        totalCount: number;
        nodes: Array<{
          __typename: 'InstalledPluginNode';
          id: string;
          code: string;
          version: string;
          kind: Types.InstalledPluginKindType;
          types: Array<string>;
          hostRuntime?: string | null;
        }>;
      };
    };
  };
};

export type InstallUploadedPluginMutationVariables = Types.Exact<{
  fileId: Types.Scalars['String']['input'];
}>;

export type InstallUploadedPluginMutation = {
  __typename: 'Mutations';
  centralServer: {
    __typename: 'CentralServerMutationNode';
    plugins: {
      __typename: 'CentralPluginMutations';
      installUploadedPlugin: { __typename: 'PluginInfoNode'; pluginInfo: any };
    };
  };
};

export type UninstallPluginMutationVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
}>;

export type UninstallPluginMutation = {
  __typename: 'Mutations';
  centralServer: {
    __typename: 'CentralServerMutationNode';
    plugins: {
      __typename: 'CentralPluginMutations';
      uninstallPlugin: {
        __typename: 'UninstallPluginNode';
        id: string;
        code: string;
        kind: Types.InstalledPluginKindType;
      };
    };
  };
};

export type PluginConfigurationQueryVariables = Types.Exact<{
  pluginCode: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type PluginConfigurationQuery = {
  __typename: 'Queries';
  pluginData: {
    __typename: 'PluginDataConnector';
    nodes: Array<{
      __typename: 'PluginDataNode';
      id: string;
      data: string;
      storeId?: string | null;
    }>;
  };
};

export type InsertPluginConfigurationMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertPluginDataInput;
}>;

export type InsertPluginConfigurationMutation = {
  __typename: 'Mutations';
  insertPluginData: { __typename: 'PluginDataNode'; id: string };
};

export type UpdatePluginConfigurationMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdatePluginDataInput;
}>;

export type UpdatePluginConfigurationMutation = {
  __typename: 'Mutations';
  updatePluginData: { __typename: 'PluginDataNode'; id: string };
};

export const InstalledPluginNodeFragmentDoc = gql`
  fragment InstalledPluginNode on InstalledPluginNode {
    __typename
    id
    code
    version
    kind
    types
    hostRuntime
  }
`;
export const InstalledPluginsDocument = gql`
  query installedPlugins {
    centralServer {
      plugin {
        installedPlugins {
          __typename
          totalCount
          nodes {
            ...InstalledPluginNode
          }
        }
      }
    }
  }
  ${InstalledPluginNodeFragmentDoc}
`;
export const InstallUploadedPluginDocument = gql`
  mutation installUploadedPlugin($fileId: String!) {
    centralServer {
      plugins {
        installUploadedPlugin(fileId: $fileId) {
          pluginInfo
        }
      }
    }
  }
`;
export const UninstallPluginDocument = gql`
  mutation uninstallPlugin($id: String!) {
    centralServer {
      plugins {
        uninstallPlugin(id: $id) {
          id
          code
          kind
        }
      }
    }
  }
`;
export const PluginConfigurationDocument = gql`
  query pluginConfiguration($pluginCode: String!, $storeId: String!) {
    pluginData(
      pluginCode: $pluginCode
      storeId: $storeId
      filter: { dataIdentifier: { equalTo: "configuration" } }
    ) {
      __typename
      ... on PluginDataConnector {
        nodes {
          id
          data
          storeId
        }
      }
    }
  }
`;
export const InsertPluginConfigurationDocument = gql`
  mutation insertPluginConfiguration(
    $storeId: String!
    $input: InsertPluginDataInput!
  ) {
    insertPluginData(input: $input, storeId: $storeId) {
      ... on PluginDataNode {
        __typename
        id
      }
    }
  }
`;
export const UpdatePluginConfigurationDocument = gql`
  mutation updatePluginConfiguration(
    $storeId: String!
    $input: UpdatePluginDataInput!
  ) {
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
    installedPlugins(
      variables?: InstalledPluginsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<InstalledPluginsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InstalledPluginsQuery>({
            document: InstalledPluginsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'installedPlugins',
        'query',
        variables
      );
    },
    installUploadedPlugin(
      variables: InstallUploadedPluginMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<InstallUploadedPluginMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InstallUploadedPluginMutation>({
            document: InstallUploadedPluginDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'installUploadedPlugin',
        'mutation',
        variables
      );
    },
    uninstallPlugin(
      variables: UninstallPluginMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<UninstallPluginMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UninstallPluginMutation>({
            document: UninstallPluginDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'uninstallPlugin',
        'mutation',
        variables
      );
    },
    pluginConfiguration(
      variables: PluginConfigurationQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<PluginConfigurationQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PluginConfigurationQuery>({
            document: PluginConfigurationDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'pluginConfiguration',
        'query',
        variables
      );
    },
    insertPluginConfiguration(
      variables: InsertPluginConfigurationMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<InsertPluginConfigurationMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertPluginConfigurationMutation>({
            document: InsertPluginConfigurationDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'insertPluginConfiguration',
        'mutation',
        variables
      );
    },
    updatePluginConfiguration(
      variables: UpdatePluginConfigurationMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<UpdatePluginConfigurationMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdatePluginConfigurationMutation>({
            document: UpdatePluginConfigurationDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updatePluginConfiguration',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
