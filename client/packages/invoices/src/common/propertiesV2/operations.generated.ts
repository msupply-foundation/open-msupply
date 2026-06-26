import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type InvoicePropertyV2Fragment = {
  __typename: 'PropertyV2Node';
  id: string;
  key: string;
  name: string;
  valueType: Types.PropertyNodeValueTypeV2;
  kind: Types.PropertyNodeKindV2;
  options: Array<{
    __typename: 'PropertyOptionV2Node';
    id: string;
    key: string;
    name: string;
    parentOptionId?: string | null;
  }>;
};

export type InvoicePropertiesV2QueryVariables = Types.Exact<{
  tableName: Types.Scalars['String']['input'];
}>;

export type InvoicePropertiesV2Query = {
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
      kind: Types.PropertyNodeKindV2;
      options: Array<{
        __typename: 'PropertyOptionV2Node';
        id: string;
        key: string;
        name: string;
        parentOptionId?: string | null;
      }>;
    }>;
  };
};

export const InvoicePropertyV2FragmentDoc = gql`
  fragment InvoicePropertyV2 on PropertyV2Node {
    id
    key
    name
    valueType
    kind
    options {
      id
      key
      name
      parentOptionId
    }
  }
`;
export const InvoicePropertiesV2Document = gql`
  query invoicePropertiesV2($tableName: String!) {
    propertiesV2(filter: { tableName: { equalTo: $tableName } }) {
      ... on PropertyV2Connector {
        __typename
        totalCount
        nodes {
          ...InvoicePropertyV2
        }
      }
    }
  }
  ${InvoicePropertyV2FragmentDoc}
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
    invoicePropertiesV2(
      variables: InvoicePropertiesV2QueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<InvoicePropertiesV2Query> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InvoicePropertiesV2Query>({
            document: InvoicePropertiesV2Document,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'invoicePropertiesV2',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
