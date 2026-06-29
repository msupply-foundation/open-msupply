import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type InvoiceCustomFieldFragment = {
  __typename: 'CustomFieldNode';
  id: string;
  key: string;
  name: string;
  valueType: Types.CustomFieldNodeValueType;
  kind: Types.CustomFieldNodeKind;
  displayMode?: Types.CustomFieldNodeDisplayMode | null;
  options: Array<{
    __typename: 'CustomFieldOptionNode';
    id: string;
    key: string;
    name: string;
    parentOptionId?: string | null;
  }>;
};

export type InvoiceCustomFieldsQueryVariables = Types.Exact<{
  tableName: Types.Scalars['String']['input'];
}>;

export type InvoiceCustomFieldsQuery = {
  __typename: 'Queries';
  customFields: {
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
      options: Array<{
        __typename: 'CustomFieldOptionNode';
        id: string;
        key: string;
        name: string;
        parentOptionId?: string | null;
      }>;
    }>;
  };
};

export const InvoiceCustomFieldFragmentDoc = gql`
  fragment InvoiceCustomField on CustomFieldNode {
    id
    key
    name
    valueType
    kind
    displayMode
    options {
      id
      key
      name
      parentOptionId
    }
  }
`;
export const InvoiceCustomFieldsDocument = gql`
  query invoiceCustomFields($tableName: String!) {
    customFields(filter: { tableName: { equalTo: $tableName } }) {
      ... on CustomFieldConnector {
        __typename
        totalCount
        nodes {
          ...InvoiceCustomField
        }
      }
    }
  }
  ${InvoiceCustomFieldFragmentDoc}
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
    invoiceCustomFields(
      variables: InvoiceCustomFieldsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<InvoiceCustomFieldsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InvoiceCustomFieldsQuery>({
            document: InvoiceCustomFieldsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'invoiceCustomFields',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
