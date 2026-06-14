import * as Types from '../../gql/schema';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type SupplierReturnLineRowFragment = {
  __typename: 'InvoiceLineNode';
  id: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  batch?: string | null;
  expiryDate?: string | null;
  packSize: number;
  numberOfPacks: number;
  costPricePerPack: number;
  sellPricePerPack: number;
  item: {
    __typename: 'ItemNode';
    id: string;
    code: string;
    name: string;
    unitName?: string | null;
  };
};

export type SupplierReturnDetailFragment = {
  __typename: 'InvoiceNode';
  id: string;
  invoiceNumber: number;
  type: Types.InvoiceNodeType;
  status: Types.InvoiceNodeStatus;
  onHold: boolean;
  theirReference?: string | null;
  comment?: string | null;
  colour?: string | null;
  otherPartyName: string;
  createdDatetime: string;
  pickedDatetime?: string | null;
  shippedDatetime?: string | null;
  deliveredDatetime?: string | null;
  receivedDatetime?: string | null;
  verifiedDatetime?: string | null;
  lines: {
    __typename: 'InvoiceLineConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'InvoiceLineNode';
      id: string;
      itemId: string;
      itemName: string;
      itemCode: string;
      batch?: string | null;
      expiryDate?: string | null;
      packSize: number;
      numberOfPacks: number;
      costPricePerPack: number;
      sellPricePerPack: number;
      item: {
        __typename: 'ItemNode';
        id: string;
        code: string;
        name: string;
        unitName?: string | null;
      };
    }>;
  };
};

export type SupplierReturnQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  invoiceId: Types.Scalars['String']['input'];
}>;

export type SupplierReturnQuery = {
  __typename: 'Queries';
  invoice:
    | {
        __typename: 'InvoiceNode';
        id: string;
        invoiceNumber: number;
        type: Types.InvoiceNodeType;
        status: Types.InvoiceNodeStatus;
        onHold: boolean;
        theirReference?: string | null;
        comment?: string | null;
        colour?: string | null;
        otherPartyName: string;
        createdDatetime: string;
        pickedDatetime?: string | null;
        shippedDatetime?: string | null;
        deliveredDatetime?: string | null;
        receivedDatetime?: string | null;
        verifiedDatetime?: string | null;
        lines: {
          __typename: 'InvoiceLineConnector';
          totalCount: number;
          nodes: Array<{
            __typename: 'InvoiceLineNode';
            id: string;
            itemId: string;
            itemName: string;
            itemCode: string;
            batch?: string | null;
            expiryDate?: string | null;
            packSize: number;
            numberOfPacks: number;
            costPricePerPack: number;
            sellPricePerPack: number;
            item: {
              __typename: 'ItemNode';
              id: string;
              code: string;
              name: string;
              unitName?: string | null;
            };
          }>;
        };
      }
    | { __typename: 'NodeError' };
};

export type UpdateSupplierReturnMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateSupplierReturnInput;
}>;

export type UpdateSupplierReturnMutation = {
  __typename: 'Mutations';
  updateSupplierReturn: {
    __typename: 'InvoiceNode';
    id: string;
    status: Types.InvoiceNodeStatus;
  };
};

export const SupplierReturnLineRowFragmentDoc = gql`
  fragment SupplierReturnLineRow on InvoiceLineNode {
    __typename
    id
    itemId
    itemName
    itemCode
    batch
    expiryDate
    packSize
    numberOfPacks
    costPricePerPack
    sellPricePerPack
    item {
      __typename
      id
      code
      name
      unitName
    }
  }
`;
export const SupplierReturnDetailFragmentDoc = gql`
  fragment SupplierReturnDetail on InvoiceNode {
    __typename
    id
    invoiceNumber
    type
    status
    onHold
    theirReference
    comment
    colour
    otherPartyName
    createdDatetime
    pickedDatetime
    shippedDatetime
    deliveredDatetime
    receivedDatetime
    verifiedDatetime
    lines {
      __typename
      totalCount
      nodes {
        ...SupplierReturnLineRow
      }
    }
  }
  ${SupplierReturnLineRowFragmentDoc}
`;
export const SupplierReturnDocument = gql`
  query supplierReturn($storeId: String!, $invoiceId: String!) {
    invoice(storeId: $storeId, id: $invoiceId) {
      ... on InvoiceNode {
        ...SupplierReturnDetail
      }
    }
  }
  ${SupplierReturnDetailFragmentDoc}
`;
export const UpdateSupplierReturnDocument = gql`
  mutation updateSupplierReturn(
    $storeId: String!
    $input: UpdateSupplierReturnInput!
  ) {
    updateSupplierReturn(storeId: $storeId, input: $input) {
      __typename
      ... on InvoiceNode {
        id
        status
      }
    }
  }
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
    supplierReturn(
      variables: SupplierReturnQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<SupplierReturnQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SupplierReturnQuery>({
            document: SupplierReturnDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'supplierReturn',
        'query',
        variables,
      );
    },
    updateSupplierReturn(
      variables: UpdateSupplierReturnMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<UpdateSupplierReturnMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateSupplierReturnMutation>({
            document: UpdateSupplierReturnDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updateSupplierReturn',
        'mutation',
        variables,
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
