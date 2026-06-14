import * as Types from '../../gql/schema';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type CustomerReturnLineRowFragment = {
  __typename: 'InvoiceLineNode';
  id: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  batch?: string | null;
  expiryDate?: string | null;
  packSize: number;
  numberOfPacks: number;
  sellPricePerPack: number;
  item: {
    __typename: 'ItemNode';
    id: string;
    code: string;
    name: string;
    unitName?: string | null;
  };
};

export type CustomerReturnDetailFragment = {
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
  receivedDatetime?: string | null;
  verifiedDatetime?: string | null;
  linkedShipment?: { __typename: 'InvoiceNode'; id: string } | null;
  user?: { __typename: 'UserNode'; username: string } | null;
  pricing: { __typename: 'PricingNode'; totalAfterTax: number };
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

export type CustomerReturnQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  invoiceId: Types.Scalars['String']['input'];
}>;

export type CustomerReturnQuery = {
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
        receivedDatetime?: string | null;
        verifiedDatetime?: string | null;
        linkedShipment?: { __typename: 'InvoiceNode'; id: string } | null;
        user?: { __typename: 'UserNode'; username: string } | null;
        pricing: { __typename: 'PricingNode'; totalAfterTax: number };
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

export type UpdateCustomerReturnMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateCustomerReturnInput;
}>;

export type UpdateCustomerReturnMutation = {
  __typename: 'Mutations';
  updateCustomerReturn:
    | { __typename: 'InvoiceNode'; id: string; status: Types.InvoiceNodeStatus }
    | {
        __typename: 'UpdateCustomerReturnError';
        error:
          | { __typename: 'OtherPartyNotACustomer'; description: string }
          | { __typename: 'OtherPartyNotVisible'; description: string };
      };
};

export const CustomerReturnLineRowFragmentDoc = gql`
  fragment CustomerReturnLineRow on InvoiceLineNode {
    __typename
    id
    itemId
    itemName
    itemCode
    batch
    expiryDate
    packSize
    numberOfPacks
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
export const CustomerReturnDetailFragmentDoc = gql`
  fragment CustomerReturnDetail on InvoiceNode {
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
    receivedDatetime
    verifiedDatetime
    linkedShipment {
      __typename
      id
    }
    user {
      __typename
      username
    }
    pricing {
      __typename
      totalAfterTax
    }
    lines {
      __typename
      totalCount
      nodes {
        ...CustomerReturnLineRow
      }
    }
  }
  ${CustomerReturnLineRowFragmentDoc}
`;
export const CustomerReturnDocument = gql`
  query customerReturn($storeId: String!, $invoiceId: String!) {
    invoice(storeId: $storeId, id: $invoiceId) {
      ... on InvoiceNode {
        ...CustomerReturnDetail
      }
    }
  }
  ${CustomerReturnDetailFragmentDoc}
`;
export const UpdateCustomerReturnDocument = gql`
  mutation updateCustomerReturn(
    $storeId: String!
    $input: UpdateCustomerReturnInput!
  ) {
    updateCustomerReturn(storeId: $storeId, input: $input) {
      __typename
      ... on InvoiceNode {
        id
        status
      }
      ... on UpdateCustomerReturnError {
        error {
          __typename
          description
        }
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
    customerReturn(
      variables: CustomerReturnQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<CustomerReturnQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<CustomerReturnQuery>({
            document: CustomerReturnDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'customerReturn',
        'query',
        variables,
      );
    },
    updateCustomerReturn(
      variables: UpdateCustomerReturnMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<UpdateCustomerReturnMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateCustomerReturnMutation>({
            document: UpdateCustomerReturnDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updateCustomerReturn',
        'mutation',
        variables,
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
