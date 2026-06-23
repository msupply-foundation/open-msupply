import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type PropertyConfigScopeFragment = {
  __typename: 'PropertyScopeV2Node';
  id: string;
  tableName: string;
  displayMode: Types.PropertyNodeDisplayModeV2;
};

export type PropertyConfigRowFragment = {
  __typename: 'PropertyV2Node';
  id: string;
  key: string;
  name: string;
  valueType: Types.PropertyNodeValueTypeV2;
  isLegacy: boolean;
  scopes: Array<{
    __typename: 'PropertyScopeV2Node';
    id: string;
    tableName: string;
    displayMode: Types.PropertyNodeDisplayModeV2;
  }>;
};

export type PropertyConfigListQueryVariables = Types.Exact<{
  [key: string]: never;
}>;

export type PropertyConfigListQuery = {
  __typename: 'Queries';
  propertiesV2: {
    __typename: 'PropertyV2Connector';
    totalCount: number;
    nodes: Array<{
      __typename: 'PropertyV2Node';
      id: string;
      key: string;
      name: string;
      valueType: Types.PropertyNodeValueTypeV2;
      isLegacy: boolean;
      scopes: Array<{
        __typename: 'PropertyScopeV2Node';
        id: string;
        tableName: string;
        displayMode: Types.PropertyNodeDisplayModeV2;
      }>;
    }>;
  };
};

export type SetPropertyDisplayModeMutationVariables = Types.Exact<{
  input: Types.SetPropertyDisplayModeInput;
}>;

export type SetPropertyDisplayModeMutation = {
  __typename: 'Mutations';
  centralServer: {
    __typename: 'CentralServerMutationNode';
    general: {
      __typename: 'CentralGeneralMutations';
      setPropertyDisplayMode: {
        __typename: 'SetPropertyDisplayModeNode';
        propertyId: string;
        tableName: string;
        displayMode?: Types.PropertyNodeDisplayModeV2 | null;
      };
    };
  };
};

export const PropertyConfigScopeFragmentDoc = gql`
  fragment PropertyConfigScope on PropertyScopeV2Node {
    __typename
    id
    tableName
    displayMode
  }
`;
export const PropertyConfigRowFragmentDoc = gql`
  fragment PropertyConfigRow on PropertyV2Node {
    __typename
    id
    key
    name
    valueType
    isLegacy
    scopes {
      ...PropertyConfigScope
    }
  }
  ${PropertyConfigScopeFragmentDoc}
`;
export const PropertyConfigListDocument = gql`
  query propertyConfigList {
    propertiesV2 {
      ... on PropertyV2Connector {
        __typename
        totalCount
        nodes {
          ...PropertyConfigRow
        }
      }
    }
  }
  ${PropertyConfigRowFragmentDoc}
`;
export const SetPropertyDisplayModeDocument = gql`
  mutation setPropertyDisplayMode($input: SetPropertyDisplayModeInput!) {
    centralServer {
      general {
        setPropertyDisplayMode(input: $input) {
          ... on SetPropertyDisplayModeNode {
            __typename
            propertyId
            tableName
            displayMode
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
    propertyConfigList(
      variables?: PropertyConfigListQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<PropertyConfigListQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PropertyConfigListQuery>({
            document: PropertyConfigListDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'propertyConfigList',
        'query',
        variables
      );
    },
    setPropertyDisplayMode(
      variables: SetPropertyDisplayModeMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<SetPropertyDisplayModeMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SetPropertyDisplayModeMutation>({
            document: SetPropertyDisplayModeDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'setPropertyDisplayMode',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
