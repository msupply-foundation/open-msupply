import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];

export enum InstalledPluginKindType {
  Backend = 'BACKEND',
  Frontend = 'FRONTEND',
}

export type InstalledPluginNodeFragment = {
  __typename: 'InstalledPluginNode';
  id: string;
  code: string;
  version: string;
  kind: InstalledPluginKindType;
  types: string[];
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
        nodes: Array<InstalledPluginNodeFragment>;
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
      installUploadedPlugin: {
        __typename: 'PluginInfoNode';
        pluginInfo: Types.Scalars['JSON']['output'];
      };
    };
  };
};

export const InstalledPluginNodeFragmentDoc = gql`
  fragment InstalledPluginNode on InstalledPluginNode {
    __typename
    id
    code
    version
    kind
    types
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
  };
}
export type Sdk = ReturnType<typeof getSdk>;
