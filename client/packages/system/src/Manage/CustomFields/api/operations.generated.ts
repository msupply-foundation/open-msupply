import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type CustomFieldConfigRowFragment = {
  __typename: 'CustomFieldNode';
  id: string;
  key: string;
  name: string;
  valueType: Types.CustomFieldNodeValueType;
  kind: Types.CustomFieldNodeKind;
  displayMode?: Types.CustomFieldNodeDisplayMode | null;
};

export type CustomFieldScopeConfigQueryVariables = Types.Exact<{
  scope: Types.Scalars['String']['input'];
}>;

export type CustomFieldScopeConfigQuery = {
  __typename: 'Queries';
  centralServer: {
    __typename: 'CentralServerQueryNode';
    customField: {
      __typename: 'CustomFieldConfigQueries';
      customFieldScopeConfig: {
        __typename: 'CustomFieldConnector';
        totalCount: number;
        nodes: Array<{
          __typename: 'CustomFieldNode';
          id: string;
          key: string;
          name: string;
          valueType: Types.CustomFieldNodeValueType;
          kind: Types.CustomFieldNodeKind;
          displayMode?: Types.CustomFieldNodeDisplayMode | null;
        }>;
      };
    };
  };
};

export type UpdateCustomFieldScopesMutationVariables = Types.Exact<{
  input: Types.UpdateCustomFieldScopesInput;
}>;

export type UpdateCustomFieldScopesMutation = {
  __typename: 'Mutations';
  centralServer: {
    __typename: 'CentralServerMutationNode';
    customField: {
      __typename: 'CustomFieldMutations';
      updateScopes: {
        __typename: 'CustomFieldConnector';
        totalCount: number;
        nodes: Array<{
          __typename: 'CustomFieldNode';
          id: string;
          key: string;
          name: string;
          valueType: Types.CustomFieldNodeValueType;
          kind: Types.CustomFieldNodeKind;
          displayMode?: Types.CustomFieldNodeDisplayMode | null;
        }>;
      };
    };
  };
};

export const CustomFieldConfigRowFragmentDoc = gql`
  fragment CustomFieldConfigRow on CustomFieldNode {
    __typename
    id
    key
    name
    valueType
    kind
    displayMode
  }
`;
export const CustomFieldScopeConfigDocument = gql`
  query customFieldScopeConfig($scope: String!) {
    centralServer {
      customField {
        customFieldScopeConfig(scope: $scope) {
          __typename
          ... on CustomFieldConnector {
            __typename
            totalCount
            nodes {
              ...CustomFieldConfigRow
            }
          }
        }
      }
    }
  }
  ${CustomFieldConfigRowFragmentDoc}
`;
export const UpdateCustomFieldScopesDocument = gql`
  mutation updateCustomFieldScopes($input: UpdateCustomFieldScopesInput!) {
    centralServer {
      customField {
        updateScopes(input: $input) {
          __typename
          ... on CustomFieldConnector {
            __typename
            totalCount
            nodes {
              ...CustomFieldConfigRow
            }
          }
        }
      }
    }
  }
  ${CustomFieldConfigRowFragmentDoc}
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
    customFieldScopeConfig(
      variables: CustomFieldScopeConfigQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<CustomFieldScopeConfigQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<CustomFieldScopeConfigQuery>({
            document: CustomFieldScopeConfigDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'customFieldScopeConfig',
        'query',
        variables
      );
    },
    updateCustomFieldScopes(
      variables: UpdateCustomFieldScopesMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<UpdateCustomFieldScopesMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateCustomFieldScopesMutation>({
            document: UpdateCustomFieldScopesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updateCustomFieldScopes',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
