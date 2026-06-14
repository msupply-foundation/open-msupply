import * as Types from '../../gql/schema';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type CustomerDetailFragment = {
  __typename: 'NameNode';
  id: string;
  name: string;
  code: string;
  isCustomer: boolean;
  isDonor: boolean;
  isManufacturer: boolean;
  isOnHold: boolean;
  chargeCode?: string | null;
  comment?: string | null;
  phone?: string | null;
  country?: string | null;
  address1?: string | null;
  address2?: string | null;
  website?: string | null;
  createdDatetime?: string | null;
  store?: { __typename: 'StoreNode'; id: string; code: string } | null;
};

export type CustomerByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  nameId: Types.Scalars['String']['input'];
}>;

export type CustomerByIdQuery = {
  __typename: 'Queries';
  names: {
    __typename: 'NameConnector';
    nodes: Array<{
      __typename: 'NameNode';
      id: string;
      name: string;
      code: string;
      isCustomer: boolean;
      isDonor: boolean;
      isManufacturer: boolean;
      isOnHold: boolean;
      chargeCode?: string | null;
      comment?: string | null;
      phone?: string | null;
      country?: string | null;
      address1?: string | null;
      address2?: string | null;
      website?: string | null;
      createdDatetime?: string | null;
      store?: { __typename: 'StoreNode'; id: string; code: string } | null;
    }>;
  };
};

export const CustomerDetailFragmentDoc = gql`
  fragment CustomerDetail on NameNode {
    __typename
    id
    name
    code
    isCustomer
    isDonor
    isManufacturer
    isOnHold
    chargeCode
    comment
    phone
    country
    address1
    address2
    website
    createdDatetime
    store {
      __typename
      id
      code
    }
  }
`;
export const CustomerByIdDocument = gql`
  query customerById($storeId: String!, $nameId: String!) {
    names(storeId: $storeId, filter: { id: { equalTo: $nameId } }) {
      ... on NameConnector {
        __typename
        nodes {
          ...CustomerDetail
        }
      }
    }
  }
  ${CustomerDetailFragmentDoc}
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string,
  variables?: any,
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (
  action,
  _operationName,
  _operationType,
  _variables,
) => action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper,
) {
  return {
    customerById(
      variables: CustomerByIdQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<CustomerByIdQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<CustomerByIdQuery>({
            document: CustomerByIdDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'customerById',
        'query',
        variables,
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
