import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
import { ItemDirectionFragmentDoc } from '../../../../system/src/Item/api/operations.generated';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
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
  itemVariantId?: string | null;
  vvmStatusId?: string | null;
  vvmStatus?: {
    __typename: 'VvmstatusNode';
    id: string;
    description: string;
  } | null;
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
    volumePerPack: number;
    item: {
      __typename: 'ItemNode';
      name: string;
      code: string;
      isVaccine: boolean;
      doses: number;
    };
  } | null;
};

export type DraftStockOutLineFragment = {
  __typename: 'DraftStockOutLineNode';
  id: string;
  stockLineId: string;
  numberOfPacks: number;
  packSize: number;
  batch?: string | null;
  expiryDate?: string | null;
  sellPricePerPack: number;
  inStorePacks: number;
  availablePacks: number;
  stockLineOnHold: boolean;
  dosesPerUnit: number;
  itemVariantId?: string | null;
  vvmStatusId?: string | null;
  volumePerPack?: number | null;
  location?: {
    __typename: 'LocationNode';
    id: string;
    name: string;
    code: string;
    onHold: boolean;
  } | null;
  vvmStatus?: {
    __typename: 'VvmstatusNode';
    id: string;
    priority: number;
    unusable: boolean;
    description: string;
  } | null;
  donor?: { __typename: 'NameNode'; id: string; name: string } | null;
  program?: { __typename: 'ProgramNode'; name: string; id: string } | null;
  campaign?: { __typename: 'CampaignNode'; name: string; id: string } | null;
};

export type GetOutboundEditLinesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  itemId: Types.Scalars['String']['input'];
  invoiceId: Types.Scalars['String']['input'];
}>;

export type GetOutboundEditLinesQuery = {
  __typename: 'Queries';
  items: {
    __typename: 'ItemConnector';
    nodes: Array<{
      __typename: 'ItemNode';
      id: string;
      unitName?: string | null;
      name: string;
      isVaccine: boolean;
      doses: number;
      itemDirections: Array<{
        __typename: 'ItemDirectionNode';
        directions: string;
        id: string;
        itemId: string;
        priority: number;
      }>;
    }>;
  };
  draftStockOutLines: {
    __typename: 'DraftStockOutItemData';
    placeholderQuantity?: number | null;
    prescribedQuantity?: number | null;
    note?: string | null;
    draftLines: Array<{
      __typename: 'DraftStockOutLineNode';
      id: string;
      stockLineId: string;
      numberOfPacks: number;
      packSize: number;
      batch?: string | null;
      expiryDate?: string | null;
      sellPricePerPack: number;
      inStorePacks: number;
      availablePacks: number;
      stockLineOnHold: boolean;
      dosesPerUnit: number;
      itemVariantId?: string | null;
      vvmStatusId?: string | null;
      volumePerPack?: number | null;
      location?: {
        __typename: 'LocationNode';
        id: string;
        name: string;
        code: string;
        onHold: boolean;
      } | null;
      vvmStatus?: {
        __typename: 'VvmstatusNode';
        id: string;
        priority: number;
        unusable: boolean;
        description: string;
      } | null;
      donor?: { __typename: 'NameNode'; id: string; name: string } | null;
      program?: { __typename: 'ProgramNode'; name: string; id: string } | null;
      campaign?: {
        __typename: 'CampaignNode';
        name: string;
        id: string;
      } | null;
    }>;
  };
};

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
    itemVariantId
    vvmStatusId
    vvmStatus {
      id
      description
    }
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
      volumePerPack
    }
  }
`;
export const DraftStockOutLineFragmentDoc = gql`
  fragment DraftStockOutLine on DraftStockOutLineNode {
    __typename
    id
    stockLineId
    numberOfPacks
    packSize
    batch
    expiryDate
    sellPricePerPack
    inStorePacks
    availablePacks
    stockLineOnHold
    dosesPerUnit
    itemVariantId
    vvmStatusId
    location {
      __typename
      id
      name
      code
      onHold
    }
    vvmStatus {
      __typename
      id
      priority
      unusable
      description
    }
    donor(storeId: $storeId) {
      id
      name
    }
    program {
      name
      id
    }
    campaign {
      name
      id
    }
    volumePerPack
  }
`;
export const GetOutboundEditLinesDocument = gql`
  query getOutboundEditLines(
    $storeId: String!
    $itemId: String!
    $invoiceId: String!
  ) {
    items(
      storeId: $storeId
      filter: { id: { equalTo: $itemId }, isActive: true }
    ) {
      ... on ItemConnector {
        __typename
        nodes {
          __typename
          id
          unitName
          name
          isVaccine
          doses
          itemDirections {
            ...ItemDirection
          }
        }
      }
    }
    draftStockOutLines(
      storeId: $storeId
      itemId: $itemId
      invoiceId: $invoiceId
    ) {
      ... on DraftStockOutItemData {
        placeholderQuantity
        prescribedQuantity
        note
        draftLines {
          ...DraftStockOutLine
        }
      }
    }
  }
  ${ItemDirectionFragmentDoc}
  ${DraftStockOutLineFragmentDoc}
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
    getOutboundEditLines(
      variables: GetOutboundEditLinesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<GetOutboundEditLinesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<GetOutboundEditLinesQuery>({
            document: GetOutboundEditLinesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'getOutboundEditLines',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
