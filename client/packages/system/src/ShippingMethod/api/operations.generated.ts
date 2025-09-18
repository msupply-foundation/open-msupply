import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type ShippingMethodRowFragment = {
  __typename: 'ShippingMethodNode';
  id: string;
  method: string;
  deletedDatetime?: string | null;
};

export type ShippingMethodsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  filter?: Types.InputMaybe<Types.ShippingMethodFilterInput>;
}>;

export type ShippingMethodsQuery = {
  __typename: 'Queries';
  shippingMethods: {
    __typename: 'ShippingMethodConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'ShippingMethodNode';
      id: string;
      method: string;
      deletedDatetime?: string | null;
    }>;
  };
};

export const ShippingMethodRowFragmentDoc = gql`
  fragment ShippingMethodRow on ShippingMethodNode {
    id
    method
    deletedDatetime
  }
`;
export const ShippingMethodsDocument = gql`
  query shippingMethods($storeId: String!, $filter: ShippingMethodFilterInput) {
    shippingMethods(storeId: $storeId, filter: $filter) {
      ... on ShippingMethodConnector {
        nodes {
          ...ShippingMethodRow
        }
        totalCount
      }
    }
  }
  ${ShippingMethodRowFragmentDoc}
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
    shippingMethods(
      variables: ShippingMethodsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<ShippingMethodsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ShippingMethodsQuery>(
            ShippingMethodsDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'shippingMethods',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
