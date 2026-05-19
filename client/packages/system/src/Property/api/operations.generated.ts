import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type PropertyOptionFragment = {
  __typename: 'PropertyOptionNode';
  id: string;
  propertyId: string;
  name: string;
  translationKey?: string | null;
  isDeleted: boolean;
};

export type PropertyAttachmentFragment = {
  __typename: 'PropertyTableNode';
  id: string;
  propertyId: string;
  table: Types.PropertyParentTableEnum;
};

export type PropertyDetailFragment = {
  __typename: 'PropertyNode';
  id: string;
  name: string;
  type: Types.PropertyTypeEnum;
  translationKey?: string | null;
  options: Array<{
    __typename: 'PropertyOptionNode';
    id: string;
    propertyId: string;
    name: string;
    translationKey?: string | null;
    isDeleted: boolean;
  }>;
  attachedTo: Array<{
    __typename: 'PropertyTableNode';
    id: string;
    propertyId: string;
    table: Types.PropertyParentTableEnum;
  }>;
};

export type PropertyValueFragment = {
  __typename: 'PropertyValueNode';
  id: string;
  recordId: string;
  parentTable: Types.PropertyParentTableEnum;
  valueText?: string | null;
  valueNumber?: number | null;
  valueReal?: number | null;
  valueDate?: string | null;
  property: {
    __typename: 'PropertyNode';
    id: string;
    name: string;
    type: Types.PropertyTypeEnum;
    translationKey?: string | null;
    options: Array<{
      __typename: 'PropertyOptionNode';
      id: string;
      propertyId: string;
      name: string;
      translationKey?: string | null;
      isDeleted: boolean;
    }>;
    attachedTo: Array<{
      __typename: 'PropertyTableNode';
      id: string;
      propertyId: string;
      table: Types.PropertyParentTableEnum;
    }>;
  };
  option?: {
    __typename: 'PropertyOptionNode';
    id: string;
    propertyId: string;
    name: string;
    translationKey?: string | null;
    isDeleted: boolean;
  } | null;
};

export type PropertiesQueryVariables = Types.Exact<{ [key: string]: never }>;

export type PropertiesQuery = {
  __typename: 'Queries';
  properties: Array<{
    __typename: 'PropertyNode';
    id: string;
    name: string;
    type: Types.PropertyTypeEnum;
    translationKey?: string | null;
    options: Array<{
      __typename: 'PropertyOptionNode';
      id: string;
      propertyId: string;
      name: string;
      translationKey?: string | null;
      isDeleted: boolean;
    }>;
    attachedTo: Array<{
      __typename: 'PropertyTableNode';
      id: string;
      propertyId: string;
      table: Types.PropertyParentTableEnum;
    }>;
  }>;
};

export type PropertyByIdQueryVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
}>;

export type PropertyByIdQuery = {
  __typename: 'Queries';
  propertyById?: {
    __typename: 'PropertyNode';
    id: string;
    name: string;
    type: Types.PropertyTypeEnum;
    translationKey?: string | null;
    options: Array<{
      __typename: 'PropertyOptionNode';
      id: string;
      propertyId: string;
      name: string;
      translationKey?: string | null;
      isDeleted: boolean;
    }>;
    attachedTo: Array<{
      __typename: 'PropertyTableNode';
      id: string;
      propertyId: string;
      table: Types.PropertyParentTableEnum;
    }>;
  } | null;
};

export type PropertiesForTableQueryVariables = Types.Exact<{
  table: Types.PropertyParentTableEnum;
}>;

export type PropertiesForTableQuery = {
  __typename: 'Queries';
  propertiesForTable: Array<{
    __typename: 'PropertyNode';
    id: string;
    name: string;
    type: Types.PropertyTypeEnum;
    translationKey?: string | null;
    options: Array<{
      __typename: 'PropertyOptionNode';
      id: string;
      propertyId: string;
      name: string;
      translationKey?: string | null;
      isDeleted: boolean;
    }>;
    attachedTo: Array<{
      __typename: 'PropertyTableNode';
      id: string;
      propertyId: string;
      table: Types.PropertyParentTableEnum;
    }>;
  }>;
};

export type PropertyValuesForRecordQueryVariables = Types.Exact<{
  table: Types.PropertyParentTableEnum;
  recordId: Types.Scalars['String']['input'];
}>;

export type PropertyValuesForRecordQuery = {
  __typename: 'Queries';
  propertyValues: Array<{
    __typename: 'PropertyValueNode';
    id: string;
    recordId: string;
    parentTable: Types.PropertyParentTableEnum;
    valueText?: string | null;
    valueNumber?: number | null;
    valueReal?: number | null;
    valueDate?: string | null;
    property: {
      __typename: 'PropertyNode';
      id: string;
      name: string;
      type: Types.PropertyTypeEnum;
      translationKey?: string | null;
      options: Array<{
        __typename: 'PropertyOptionNode';
        id: string;
        propertyId: string;
        name: string;
        translationKey?: string | null;
        isDeleted: boolean;
      }>;
      attachedTo: Array<{
        __typename: 'PropertyTableNode';
        id: string;
        propertyId: string;
        table: Types.PropertyParentTableEnum;
      }>;
    };
    option?: {
      __typename: 'PropertyOptionNode';
      id: string;
      propertyId: string;
      name: string;
      translationKey?: string | null;
      isDeleted: boolean;
    } | null;
  }>;
};

export type ConfigurePropertyMutationVariables = Types.Exact<{
  input: Types.ConfigurePropertyGqlInput;
}>;

export type ConfigurePropertyMutation = {
  __typename: 'Mutations';
  configureProperty: {
    __typename: 'PropertyNode';
    id: string;
    name: string;
    type: Types.PropertyTypeEnum;
    translationKey?: string | null;
    options: Array<{
      __typename: 'PropertyOptionNode';
      id: string;
      propertyId: string;
      name: string;
      translationKey?: string | null;
      isDeleted: boolean;
    }>;
    attachedTo: Array<{
      __typename: 'PropertyTableNode';
      id: string;
      propertyId: string;
      table: Types.PropertyParentTableEnum;
    }>;
  };
};

export type UpsertPropertyValueMutationVariables = Types.Exact<{
  input: Types.UpsertPropertyValueGqlInput;
}>;

export type UpsertPropertyValueMutation = {
  __typename: 'Mutations';
  upsertPropertyValue: {
    __typename: 'PropertyValueNode';
    id: string;
    recordId: string;
    parentTable: Types.PropertyParentTableEnum;
    valueText?: string | null;
    valueNumber?: number | null;
    valueReal?: number | null;
    valueDate?: string | null;
    property: {
      __typename: 'PropertyNode';
      id: string;
      name: string;
      type: Types.PropertyTypeEnum;
      translationKey?: string | null;
      options: Array<{
        __typename: 'PropertyOptionNode';
        id: string;
        propertyId: string;
        name: string;
        translationKey?: string | null;
        isDeleted: boolean;
      }>;
      attachedTo: Array<{
        __typename: 'PropertyTableNode';
        id: string;
        propertyId: string;
        table: Types.PropertyParentTableEnum;
      }>;
    };
    option?: {
      __typename: 'PropertyOptionNode';
      id: string;
      propertyId: string;
      name: string;
      translationKey?: string | null;
      isDeleted: boolean;
    } | null;
  };
};

export type DeletePropertyValueMutationVariables = Types.Exact<{
  table: Types.PropertyParentTableEnum;
  recordId: Types.Scalars['String']['input'];
  propertyId: Types.Scalars['String']['input'];
}>;

export type DeletePropertyValueMutation = {
  __typename: 'Mutations';
  deletePropertyValue: boolean;
};

export const PropertyOptionFragmentDoc = gql`
  fragment PropertyOption on PropertyOptionNode {
    __typename
    id
    propertyId
    name
    translationKey
    isDeleted
  }
`;
export const PropertyAttachmentFragmentDoc = gql`
  fragment PropertyAttachment on PropertyTableNode {
    __typename
    id
    propertyId
    table
  }
`;
export const PropertyDetailFragmentDoc = gql`
  fragment PropertyDetail on PropertyNode {
    __typename
    id
    name
    type
    translationKey
    options {
      ...PropertyOption
    }
    attachedTo {
      ...PropertyAttachment
    }
  }
  ${PropertyOptionFragmentDoc}
  ${PropertyAttachmentFragmentDoc}
`;
export const PropertyValueFragmentDoc = gql`
  fragment PropertyValue on PropertyValueNode {
    __typename
    id
    recordId
    parentTable
    property {
      ...PropertyDetail
    }
    option {
      ...PropertyOption
    }
    valueText
    valueNumber
    valueReal
    valueDate
  }
  ${PropertyDetailFragmentDoc}
  ${PropertyOptionFragmentDoc}
`;
export const PropertiesDocument = gql`
  query properties {
    properties {
      ...PropertyDetail
    }
  }
  ${PropertyDetailFragmentDoc}
`;
export const PropertyByIdDocument = gql`
  query propertyById($id: String!) {
    propertyById(id: $id) {
      ...PropertyDetail
    }
  }
  ${PropertyDetailFragmentDoc}
`;
export const PropertiesForTableDocument = gql`
  query propertiesForTable($table: PropertyParentTableEnum!) {
    propertiesForTable(table: $table) {
      ...PropertyDetail
    }
  }
  ${PropertyDetailFragmentDoc}
`;
export const PropertyValuesForRecordDocument = gql`
  query propertyValuesForRecord(
    $table: PropertyParentTableEnum!
    $recordId: String!
  ) {
    propertyValues(table: $table, recordId: $recordId) {
      ...PropertyValue
    }
  }
  ${PropertyValueFragmentDoc}
`;
export const ConfigurePropertyDocument = gql`
  mutation configureProperty($input: ConfigurePropertyGqlInput!) {
    configureProperty(input: $input) {
      ...PropertyDetail
    }
  }
  ${PropertyDetailFragmentDoc}
`;
export const UpsertPropertyValueDocument = gql`
  mutation upsertPropertyValue($input: UpsertPropertyValueGqlInput!) {
    upsertPropertyValue(input: $input) {
      ...PropertyValue
    }
  }
  ${PropertyValueFragmentDoc}
`;
export const DeletePropertyValueDocument = gql`
  mutation deletePropertyValue(
    $table: PropertyParentTableEnum!
    $recordId: String!
    $propertyId: String!
  ) {
    deletePropertyValue(
      table: $table
      recordId: $recordId
      propertyId: $propertyId
    )
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
    properties(
      variables?: PropertiesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<PropertiesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PropertiesQuery>({
            document: PropertiesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'properties',
        'query',
        variables
      );
    },
    propertyById(
      variables: PropertyByIdQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<PropertyByIdQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PropertyByIdQuery>({
            document: PropertyByIdDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'propertyById',
        'query',
        variables
      );
    },
    propertiesForTable(
      variables: PropertiesForTableQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<PropertiesForTableQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PropertiesForTableQuery>({
            document: PropertiesForTableDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'propertiesForTable',
        'query',
        variables
      );
    },
    propertyValuesForRecord(
      variables: PropertyValuesForRecordQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<PropertyValuesForRecordQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PropertyValuesForRecordQuery>({
            document: PropertyValuesForRecordDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'propertyValuesForRecord',
        'query',
        variables
      );
    },
    configureProperty(
      variables: ConfigurePropertyMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<ConfigurePropertyMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ConfigurePropertyMutation>({
            document: ConfigurePropertyDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'configureProperty',
        'mutation',
        variables
      );
    },
    upsertPropertyValue(
      variables: UpsertPropertyValueMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<UpsertPropertyValueMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpsertPropertyValueMutation>({
            document: UpsertPropertyValueDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'upsertPropertyValue',
        'mutation',
        variables
      );
    },
    deletePropertyValue(
      variables: DeletePropertyValueMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<DeletePropertyValueMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeletePropertyValueMutation>({
            document: DeletePropertyValueDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'deletePropertyValue',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
