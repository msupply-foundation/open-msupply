import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type PartialStockLineFragment = {
  __typename: 'StockLineNode';
  id: string;
  itemId: string;
  availableNumberOfPacks: number;
  totalNumberOfPacks: number;
  onHold: boolean;
  costPricePerPack: number;
  sellPricePerPack: number;
  packSize: number;
  expiryDate?: string | null;
  item: {
    __typename: 'ItemNode';
    name: string;
    code: string;
    isVaccine: boolean;
    doses: number;
  };
  location?: {
    __typename: 'LocationNode';
    id: string;
    name: string;
    code: string;
    onHold: boolean;
  } | null;
};

export type StockOutLineFragment = {
  __typename: 'InvoiceLineNode';
  id: string;
  type: Types.InvoiceLineNodeType;
  batch?: string | null;
  expiryDate?: string | null;
  numberOfPacks: number;
  prescribedQuantity?: number | null;
  packSize: number;
  invoiceId: string;
  costPricePerPack: number;
  sellPricePerPack: number;
  note?: string | null;
  totalBeforeTax: number;
  totalAfterTax: number;
  taxPercentage?: number | null;
  itemName: string;
  item: {
    __typename: 'ItemNode';
    id: string;
    name: string;
    code: string;
    unitName?: string | null;
    isVaccine: boolean;
    doses: number;
  };
  location?: {
    __typename: 'LocationNode';
    id: string;
    name: string;
    code: string;
    onHold: boolean;
  } | null;
  stockLine?: {
    __typename: 'StockLineNode';
    id: string;
    itemId: string;
    batch?: string | null;
    availableNumberOfPacks: number;
    totalNumberOfPacks: number;
    onHold: boolean;
    sellPricePerPack: number;
    costPricePerPack: number;
    packSize: number;
    expiryDate?: string | null;
    item: {
      __typename: 'ItemNode';
      name: string;
      code: string;
      isVaccine: boolean;
      doses: number;
    };
  } | null;
};

export type DummyQueryVariables = Types.Exact<{ [key: string]: never }>;

export type DummyQuery = {
  __typename: 'Queries';
  dummy: { __typename: 'UserNode' };
};

export const PartialStockLineFragmentDoc = gql`
  fragment PartialStockLine on StockLineNode {
    id
    itemId
    availableNumberOfPacks
    totalNumberOfPacks
    onHold
    costPricePerPack
    sellPricePerPack
    packSize
    expiryDate
    item {
      name
      code
      isVaccine
      doses
    }
    location {
      __typename
      id
      name
      code
      onHold
    }
  }
`;
export const StockOutLineFragmentDoc = gql`
  fragment StockOutLine on InvoiceLineNode {
    __typename
    id
    type
    batch
    expiryDate
    numberOfPacks
    prescribedQuantity
    packSize
    invoiceId
    costPricePerPack
    sellPricePerPack
    note
    totalBeforeTax
    totalAfterTax
    taxPercentage
    note
    itemName
    item {
      __typename
      id
      name
      code
      unitName
      isVaccine
      doses
    }
    location {
      __typename
      id
      name
      code
      onHold
    }
    stockLine {
      __typename
      id
      itemId
      batch
      availableNumberOfPacks
      totalNumberOfPacks
      onHold
      sellPricePerPack
      costPricePerPack
      packSize
      expiryDate
      item {
        name
        code
        isVaccine
        doses
      }
    }
  }
`;
export const DummyDocument = gql`
  query dummy {
    dummy: me {
      __typename
    }
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
    dummy(
      variables?: DummyQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<DummyQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DummyQuery>(DummyDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'dummy',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
