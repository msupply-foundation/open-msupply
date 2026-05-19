import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type PropertyV2OptionFragment = {
  __typename: 'PropertyV2OptionNode';
  id: string;
  propertyId: string;
  name: string;
  translationKey?: string | null;
  isDeleted: boolean;
};

export type PropertyV2AttachmentFragment = {
  __typename: 'PropertyV2TableNode';
  id: string;
  propertyId: string;
  table: Types.PropertyV2ParentTableEnum;
};

export type PropertyV2DetailFragment = {
  __typename: 'PropertyV2Node';
  id: string;
  name: string;
  type: Types.PropertyV2TypeEnum;
  translationKey?: string | null;
  options: Array<{
    __typename: 'PropertyV2OptionNode';
    id: string;
    propertyId: string;
    name: string;
    translationKey?: string | null;
    isDeleted: boolean;
  }>;
  attachedTo: Array<{
    __typename: 'PropertyV2TableNode';
    id: string;
    propertyId: string;
    table: Types.PropertyV2ParentTableEnum;
  }>;
};

export type PropertyV2ValueFragment = {
  __typename: 'PropertyV2ValueNode';
  id: string;
  recordId: string;
  parentTable: Types.PropertyV2ParentTableEnum;
  valueText?: string | null;
  valueNumber?: number | null;
  valueReal?: number | null;
  valueDate?: string | null;
  property: {
    __typename: 'PropertyV2Node';
    id: string;
    name: string;
    type: Types.PropertyV2TypeEnum;
    translationKey?: string | null;
    options: Array<{
      __typename: 'PropertyV2OptionNode';
      id: string;
      propertyId: string;
      name: string;
      translationKey?: string | null;
      isDeleted: boolean;
    }>;
    attachedTo: Array<{
      __typename: 'PropertyV2TableNode';
      id: string;
      propertyId: string;
      table: Types.PropertyV2ParentTableEnum;
    }>;
  };
  option?: {
    __typename: 'PropertyV2OptionNode';
    id: string;
    propertyId: string;
    name: string;
    translationKey?: string | null;
    isDeleted: boolean;
  } | null;
};

export type PropertiesV2QueryVariables = Types.Exact<{ [key: string]: never }>;

export type PropertiesV2Query = {
  __typename: 'Queries';
  propertiesV2: Array<{
    __typename: 'PropertyV2Node';
    id: string;
    name: string;
    type: Types.PropertyV2TypeEnum;
    translationKey?: string | null;
    options: Array<{
      __typename: 'PropertyV2OptionNode';
      id: string;
      propertyId: string;
      name: string;
      translationKey?: string | null;
      isDeleted: boolean;
    }>;
    attachedTo: Array<{
      __typename: 'PropertyV2TableNode';
      id: string;
      propertyId: string;
      table: Types.PropertyV2ParentTableEnum;
    }>;
  }>;
};

export type PropertyV2ByIdQueryVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
}>;

export type PropertyV2ByIdQuery = {
  __typename: 'Queries';
  propertyV2ById?: {
    __typename: 'PropertyV2Node';
    id: string;
    name: string;
    type: Types.PropertyV2TypeEnum;
    translationKey?: string | null;
    options: Array<{
      __typename: 'PropertyV2OptionNode';
      id: string;
      propertyId: string;
      name: string;
      translationKey?: string | null;
      isDeleted: boolean;
    }>;
    attachedTo: Array<{
      __typename: 'PropertyV2TableNode';
      id: string;
      propertyId: string;
      table: Types.PropertyV2ParentTableEnum;
    }>;
  } | null;
};

export type PropertiesV2ForTableQueryVariables = Types.Exact<{
  table: Types.PropertyV2ParentTableEnum;
}>;

export type PropertiesV2ForTableQuery = {
  __typename: 'Queries';
  propertiesV2ForTable: Array<{
    __typename: 'PropertyV2Node';
    id: string;
    name: string;
    type: Types.PropertyV2TypeEnum;
    translationKey?: string | null;
    options: Array<{
      __typename: 'PropertyV2OptionNode';
      id: string;
      propertyId: string;
      name: string;
      translationKey?: string | null;
      isDeleted: boolean;
    }>;
    attachedTo: Array<{
      __typename: 'PropertyV2TableNode';
      id: string;
      propertyId: string;
      table: Types.PropertyV2ParentTableEnum;
    }>;
  }>;
};

export type PropertyV2ValuesForRecordQueryVariables = Types.Exact<{
  table: Types.PropertyV2ParentTableEnum;
  recordId: Types.Scalars['String']['input'];
}>;

export type PropertyV2ValuesForRecordQuery = {
  __typename: 'Queries';
  propertyV2Values: Array<{
    __typename: 'PropertyV2ValueNode';
    id: string;
    recordId: string;
    parentTable: Types.PropertyV2ParentTableEnum;
    valueText?: string | null;
    valueNumber?: number | null;
    valueReal?: number | null;
    valueDate?: string | null;
    property: {
      __typename: 'PropertyV2Node';
      id: string;
      name: string;
      type: Types.PropertyV2TypeEnum;
      translationKey?: string | null;
      options: Array<{
        __typename: 'PropertyV2OptionNode';
        id: string;
        propertyId: string;
        name: string;
        translationKey?: string | null;
        isDeleted: boolean;
      }>;
      attachedTo: Array<{
        __typename: 'PropertyV2TableNode';
        id: string;
        propertyId: string;
        table: Types.PropertyV2ParentTableEnum;
      }>;
    };
    option?: {
      __typename: 'PropertyV2OptionNode';
      id: string;
      propertyId: string;
      name: string;
      translationKey?: string | null;
      isDeleted: boolean;
    } | null;
  }>;
};

export type ConfigurePropertyV2MutationVariables = Types.Exact<{
  input: Types.ConfigurePropertyV2GqlInput;
}>;

export type ConfigurePropertyV2Mutation = {
  __typename: 'Mutations';
  configurePropertyV2: {
    __typename: 'PropertyV2Node';
    id: string;
    name: string;
    type: Types.PropertyV2TypeEnum;
    translationKey?: string | null;
    options: Array<{
      __typename: 'PropertyV2OptionNode';
      id: string;
      propertyId: string;
      name: string;
      translationKey?: string | null;
      isDeleted: boolean;
    }>;
    attachedTo: Array<{
      __typename: 'PropertyV2TableNode';
      id: string;
      propertyId: string;
      table: Types.PropertyV2ParentTableEnum;
    }>;
  };
};

export type UpsertPropertyV2ValueMutationVariables = Types.Exact<{
  input: Types.UpsertPropertyV2ValueGqlInput;
}>;

export type UpsertPropertyV2ValueMutation = {
  __typename: 'Mutations';
  upsertPropertyV2Value: {
    __typename: 'PropertyV2ValueNode';
    id: string;
    recordId: string;
    parentTable: Types.PropertyV2ParentTableEnum;
    valueText?: string | null;
    valueNumber?: number | null;
    valueReal?: number | null;
    valueDate?: string | null;
    property: {
      __typename: 'PropertyV2Node';
      id: string;
      name: string;
      type: Types.PropertyV2TypeEnum;
      translationKey?: string | null;
      options: Array<{
        __typename: 'PropertyV2OptionNode';
        id: string;
        propertyId: string;
        name: string;
        translationKey?: string | null;
        isDeleted: boolean;
      }>;
      attachedTo: Array<{
        __typename: 'PropertyV2TableNode';
        id: string;
        propertyId: string;
        table: Types.PropertyV2ParentTableEnum;
      }>;
    };
    option?: {
      __typename: 'PropertyV2OptionNode';
      id: string;
      propertyId: string;
      name: string;
      translationKey?: string | null;
      isDeleted: boolean;
    } | null;
  };
};

export type DeletePropertyV2ValueMutationVariables = Types.Exact<{
  table: Types.PropertyV2ParentTableEnum;
  recordId: Types.Scalars['String']['input'];
  propertyId: Types.Scalars['String']['input'];
}>;

export type DeletePropertyV2ValueMutation = {
  __typename: 'Mutations';
  deletePropertyV2Value: boolean;
};

export const PropertyV2OptionFragmentDoc = gql`
  fragment PropertyV2Option on PropertyV2OptionNode {
    __typename
    id
    propertyId
    name
    translationKey
    isDeleted
  }
`;
export const PropertyV2AttachmentFragmentDoc = gql`
  fragment PropertyV2Attachment on PropertyV2TableNode {
    __typename
    id
    propertyId
    table
  }
`;
export const PropertyV2DetailFragmentDoc = gql`
  fragment PropertyV2Detail on PropertyV2Node {
    __typename
    id
    name
    type
    translationKey
    options {
      ...PropertyV2Option
    }
    attachedTo {
      ...PropertyV2Attachment
    }
  }
  ${PropertyV2OptionFragmentDoc}
  ${PropertyV2AttachmentFragmentDoc}
`;
export const PropertyV2ValueFragmentDoc = gql`
  fragment PropertyV2Value on PropertyV2ValueNode {
    __typename
    id
    recordId
    parentTable
    property {
      ...PropertyV2Detail
    }
    option {
      ...PropertyV2Option
    }
    valueText
    valueNumber
    valueReal
    valueDate
  }
  ${PropertyV2DetailFragmentDoc}
  ${PropertyV2OptionFragmentDoc}
`;
export const PropertiesV2Document = gql`
  query propertiesV2 {
    propertiesV2 {
      ...PropertyV2Detail
    }
  }
  ${PropertyV2DetailFragmentDoc}
`;
export const PropertyV2ByIdDocument = gql`
  query propertyV2ById($id: String!) {
    propertyV2ById(id: $id) {
      ...PropertyV2Detail
    }
  }
  ${PropertyV2DetailFragmentDoc}
`;
export const PropertiesV2ForTableDocument = gql`
  query propertiesV2ForTable($table: PropertyV2ParentTableEnum!) {
    propertiesV2ForTable(table: $table) {
      ...PropertyV2Detail
    }
  }
  ${PropertyV2DetailFragmentDoc}
`;
export const PropertyV2ValuesForRecordDocument = gql`
  query propertyV2ValuesForRecord(
    $table: PropertyV2ParentTableEnum!
    $recordId: String!
  ) {
    propertyV2Values(table: $table, recordId: $recordId) {
      ...PropertyV2Value
    }
  }
  ${PropertyV2ValueFragmentDoc}
`;
export const ConfigurePropertyV2Document = gql`
  mutation configurePropertyV2($input: ConfigurePropertyV2GqlInput!) {
    configurePropertyV2(input: $input) {
      ...PropertyV2Detail
    }
  }
  ${PropertyV2DetailFragmentDoc}
`;
export const UpsertPropertyV2ValueDocument = gql`
  mutation upsertPropertyV2Value($input: UpsertPropertyV2ValueGqlInput!) {
    upsertPropertyV2Value(input: $input) {
      ...PropertyV2Value
    }
  }
  ${PropertyV2ValueFragmentDoc}
`;
export const DeletePropertyV2ValueDocument = gql`
  mutation deletePropertyV2Value(
    $table: PropertyV2ParentTableEnum!
    $recordId: String!
    $propertyId: String!
  ) {
    deletePropertyV2Value(
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
    propertiesV2(
      variables?: PropertiesV2QueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<PropertiesV2Query> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PropertiesV2Query>({
            document: PropertiesV2Document,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'propertiesV2',
        'query',
        variables
      );
    },
    propertyV2ById(
      variables: PropertyV2ByIdQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<PropertyV2ByIdQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PropertyV2ByIdQuery>({
            document: PropertyV2ByIdDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'propertyV2ById',
        'query',
        variables
      );
    },
    propertiesV2ForTable(
      variables: PropertiesV2ForTableQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<PropertiesV2ForTableQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PropertiesV2ForTableQuery>({
            document: PropertiesV2ForTableDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'propertiesV2ForTable',
        'query',
        variables
      );
    },
    propertyV2ValuesForRecord(
      variables: PropertyV2ValuesForRecordQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<PropertyV2ValuesForRecordQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PropertyV2ValuesForRecordQuery>({
            document: PropertyV2ValuesForRecordDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'propertyV2ValuesForRecord',
        'query',
        variables
      );
    },
    configurePropertyV2(
      variables: ConfigurePropertyV2MutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<ConfigurePropertyV2Mutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ConfigurePropertyV2Mutation>({
            document: ConfigurePropertyV2Document,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'configurePropertyV2',
        'mutation',
        variables
      );
    },
    upsertPropertyV2Value(
      variables: UpsertPropertyV2ValueMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<UpsertPropertyV2ValueMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpsertPropertyV2ValueMutation>({
            document: UpsertPropertyV2ValueDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'upsertPropertyV2Value',
        'mutation',
        variables
      );
    },
    deletePropertyV2Value(
      variables: DeletePropertyV2ValueMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<DeletePropertyV2ValueMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeletePropertyV2ValueMutation>({
            document: DeletePropertyV2ValueDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'deletePropertyV2Value',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
