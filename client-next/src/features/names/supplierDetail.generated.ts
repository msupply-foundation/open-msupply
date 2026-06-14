import * as Types from '../../gql/schema';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type SupplierDetailFragment = {
  __typename: 'NameNode';
  id: string;
  code: string;
  name: string;
  chargeCode?: string | null;
  comment?: string | null;
  phone?: string | null;
  email?: string | null;
  hshCode?: string | null;
  hshName?: string | null;
  margin?: number | null;
  freightFactor?: number | null;
  createdDatetime?: string | null;
  isManufacturer: boolean;
  isDonor: boolean;
  isOnHold: boolean;
  address1?: string | null;
  address2?: string | null;
  country?: string | null;
  website?: string | null;
  currency?: { __typename: 'CurrencyNode'; id: string; code: string } | null;
};

export type PurchaseOrderRowFragment = {
  __typename: 'PurchaseOrderNode';
  id: string;
  number: number;
  createdDatetime: string;
  confirmedDatetime?: string | null;
  status: Types.PurchaseOrderNodeStatus;
  targetMonths?: number | null;
  comment?: string | null;
  lines: { __typename: 'PurchaseOrderLineConnector'; totalCount: number };
};

export type SupplierContactRowFragment = {
  __typename: 'ContactNode';
  id: string;
  firstName: string;
  lastName: string;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  category1?: string | null;
};

export type SupplierByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  nameId: Types.Scalars['String']['input'];
}>;

export type SupplierByIdQuery = {
  __typename: 'Queries';
  names: {
    __typename: 'NameConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'NameNode';
      id: string;
      code: string;
      name: string;
      chargeCode?: string | null;
      comment?: string | null;
      phone?: string | null;
      email?: string | null;
      hshCode?: string | null;
      hshName?: string | null;
      margin?: number | null;
      freightFactor?: number | null;
      createdDatetime?: string | null;
      isManufacturer: boolean;
      isDonor: boolean;
      isOnHold: boolean;
      address1?: string | null;
      address2?: string | null;
      country?: string | null;
      website?: string | null;
      currency?: {
        __typename: 'CurrencyNode';
        id: string;
        code: string;
      } | null;
    }>;
  };
};

export type SupplierPurchaseOrdersQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  supplierName: Types.Scalars['String']['input'];
}>;

export type SupplierPurchaseOrdersQuery = {
  __typename: 'Queries';
  purchaseOrders: {
    __typename: 'PurchaseOrderConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'PurchaseOrderNode';
      id: string;
      number: number;
      createdDatetime: string;
      confirmedDatetime?: string | null;
      status: Types.PurchaseOrderNodeStatus;
      targetMonths?: number | null;
      comment?: string | null;
      lines: { __typename: 'PurchaseOrderLineConnector'; totalCount: number };
    }>;
  };
};

export type SupplierContactsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  nameId: Types.Scalars['String']['input'];
}>;

export type SupplierContactsQuery = {
  __typename: 'Queries';
  contacts: {
    __typename: 'ContactConnector';
    nodes: Array<{
      __typename: 'ContactNode';
      id: string;
      firstName: string;
      lastName: string;
      position?: string | null;
      email?: string | null;
      phone?: string | null;
      category1?: string | null;
    }>;
  };
};

export const SupplierDetailFragmentDoc = gql`
  fragment SupplierDetail on NameNode {
    __typename
    id
    code
    name
    chargeCode
    comment
    phone
    email
    hshCode
    hshName
    margin
    freightFactor
    createdDatetime
    isManufacturer
    isDonor
    isOnHold
    address1
    address2
    country
    website
    currency {
      __typename
      id
      code
    }
  }
`;
export const PurchaseOrderRowFragmentDoc = gql`
  fragment PurchaseOrderRow on PurchaseOrderNode {
    __typename
    id
    number
    createdDatetime
    confirmedDatetime
    status
    targetMonths
    comment
    lines {
      __typename
      totalCount
    }
  }
`;
export const SupplierContactRowFragmentDoc = gql`
  fragment SupplierContactRow on ContactNode {
    __typename
    id
    firstName
    lastName
    position
    email
    phone
    category1
  }
`;
export const SupplierByIdDocument = gql`
  query supplierById($storeId: String!, $nameId: String!) {
    names(storeId: $storeId, filter: { id: { equalTo: $nameId } }) {
      ... on NameConnector {
        __typename
        totalCount
        nodes {
          ...SupplierDetail
        }
      }
    }
  }
  ${SupplierDetailFragmentDoc}
`;
export const SupplierPurchaseOrdersDocument = gql`
  query supplierPurchaseOrders($storeId: String!, $supplierName: String!) {
    purchaseOrders(
      storeId: $storeId
      filter: { supplier: { equalTo: $supplierName } }
    ) {
      ... on PurchaseOrderConnector {
        __typename
        totalCount
        nodes {
          ...PurchaseOrderRow
        }
      }
    }
  }
  ${PurchaseOrderRowFragmentDoc}
`;
export const SupplierContactsDocument = gql`
  query supplierContacts($storeId: String!, $nameId: String!) {
    contacts(storeId: $storeId, nameId: $nameId) {
      ... on ContactConnector {
        __typename
        nodes {
          ...SupplierContactRow
        }
      }
    }
  }
  ${SupplierContactRowFragmentDoc}
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
    supplierById(
      variables: SupplierByIdQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<SupplierByIdQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SupplierByIdQuery>({
            document: SupplierByIdDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'supplierById',
        'query',
        variables,
      );
    },
    supplierPurchaseOrders(
      variables: SupplierPurchaseOrdersQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<SupplierPurchaseOrdersQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SupplierPurchaseOrdersQuery>({
            document: SupplierPurchaseOrdersDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'supplierPurchaseOrders',
        'query',
        variables,
      );
    },
    supplierContacts(
      variables: SupplierContactsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<SupplierContactsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SupplierContactsQuery>({
            document: SupplierContactsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'supplierContacts',
        'query',
        variables,
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
