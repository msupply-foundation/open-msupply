import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
import { LocationRowFragmentDoc } from '../../Location/api/operations.generated';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type StockLineRowFragment = {
  __typename: 'StockLineNode';
  availableNumberOfPacks: number;
  batch?: string | null;
  costPricePerPack: number;
  expiryDate?: string | null;
  id: string;
  itemId: string;
  locationId?: string | null;
  vvmStatusId?: string | null;
  locationName?: string | null;
  onHold: boolean;
  packSize: number;
  sellPricePerPack: number;
  storeId: string;
  totalNumberOfPacks: number;
  supplierName?: string | null;
  volumePerPack: number;
  totalVolume: number;
  barcode?: string | null;
  location?: {
    __typename: 'LocationNode';
    id: string;
    name: string;
    onHold: boolean;
    code: string;
    volume: number;
    volumeUsed: number;
    locationType?: {
      __typename: 'LocationTypeNode';
      id: string;
      name: string;
      maxTemperature: number;
      minTemperature: number;
    } | null;
    stock: { __typename: 'StockLineConnector'; totalCount: number };
  } | null;
  item: {
    __typename: 'ItemNode';
    code: string;
    name: string;
    unitName?: string | null;
    isVaccine: boolean;
    restrictedLocationTypeId?: string | null;
    defaultPackSize: number;
    dosesPerUnit: number;
    masterLists?: Array<{ __typename: 'MasterListNode'; name: string }> | null;
    itemStoreProperties?: {
      __typename: 'ItemStorePropertiesNode';
      defaultSellPricePerPack: number;
    } | null;
  };
  vvmStatusLogs?: {
    __typename: 'VvmstatusLogConnector';
    nodes: Array<{
      __typename: 'VvmstatusLogNode';
      id: string;
      createdDatetime: string;
      comment?: string | null;
      user?: {
        __typename: 'UserNode';
        firstName?: string | null;
        lastName?: string | null;
        username: string;
      } | null;
      status?: {
        __typename: 'VvmstatusNode';
        id: string;
        description: string;
        code: string;
        priority: number;
      } | null;
    }>;
  } | null;
  vvmStatus?: {
    __typename: 'VvmstatusNode';
    id: string;
    priority: number;
    unusable: boolean;
    description: string;
  } | null;
  donor?: { __typename: 'NameNode'; id: string } | null;
  program?: { __typename: 'ProgramNode'; id: string; name: string } | null;
  campaign?: { __typename: 'CampaignNode'; id: string; name: string } | null;
  itemVariant?: {
    __typename: 'ItemVariantNode';
    id: string;
    packagingVariants: Array<{
      __typename: 'PackagingVariantNode';
      id: string;
      packSize?: number | null;
      volumePerUnit?: number | null;
    }>;
  } | null;
};

export type RepackStockLineFragment = {
  __typename: 'RepackStockLineNode';
  packSize: number;
  numberOfPacks: number;
  location?: {
    __typename: 'LocationNode';
    id: string;
    name: string;
    onHold: boolean;
    code: string;
    volume: number;
    volumeUsed: number;
    locationType?: {
      __typename: 'LocationTypeNode';
      id: string;
      name: string;
      maxTemperature: number;
      minTemperature: number;
    } | null;
    stock: { __typename: 'StockLineConnector'; totalCount: number };
  } | null;
};

export type RepackFragment = {
  __typename: 'RepackNode';
  id: string;
  datetime: string;
  repackId: string;
  from: {
    __typename: 'RepackStockLineNode';
    packSize: number;
    numberOfPacks: number;
    location?: {
      __typename: 'LocationNode';
      id: string;
      name: string;
      onHold: boolean;
      code: string;
      volume: number;
      volumeUsed: number;
      locationType?: {
        __typename: 'LocationTypeNode';
        id: string;
        name: string;
        maxTemperature: number;
        minTemperature: number;
      } | null;
      stock: { __typename: 'StockLineConnector'; totalCount: number };
    } | null;
  };
  to: {
    __typename: 'RepackStockLineNode';
    packSize: number;
    numberOfPacks: number;
    location?: {
      __typename: 'LocationNode';
      id: string;
      name: string;
      onHold: boolean;
      code: string;
      volume: number;
      volumeUsed: number;
      locationType?: {
        __typename: 'LocationTypeNode';
        id: string;
        name: string;
        maxTemperature: number;
        minTemperature: number;
      } | null;
      stock: { __typename: 'StockLineConnector'; totalCount: number };
    } | null;
  };
};

export type InvoiceRowFragment = {
  __typename: 'InvoiceNode';
  id: string;
  lines: {
    __typename: 'InvoiceLineConnector';
    nodes: Array<{
      __typename: 'InvoiceLineNode';
      id: string;
      itemName: string;
      numberOfPacks: number;
      itemCode: string;
      stockLine?: { __typename: 'StockLineNode'; id: string } | null;
    }>;
  };
};

export type LedgerRowFragment = {
  __typename: 'LedgerNode';
  datetime: string;
  id: string;
  invoiceType: Types.InvoiceNodeType;
  invoiceNumber: number;
  itemId: string;
  name: string;
  quantity: number;
  reason?: string | null;
  stockLineId?: string | null;
  storeId: string;
  runningBalance: number;
};

export type VvmStatusLogRowFragment = {
  __typename: 'VvmstatusLogNode';
  id: string;
  createdDatetime: string;
  comment?: string | null;
  user?: {
    __typename: 'UserNode';
    firstName?: string | null;
    lastName?: string | null;
    username: string;
  } | null;
  status?: {
    __typename: 'VvmstatusNode';
    id: string;
    description: string;
    code: string;
    priority: number;
  } | null;
};

export type StockLinesQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.StockLineSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.StockLineFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;

export type StockLinesQuery = {
  __typename: 'Queries';
  stockLines: {
    __typename: 'StockLineConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'StockLineNode';
      availableNumberOfPacks: number;
      batch?: string | null;
      costPricePerPack: number;
      expiryDate?: string | null;
      id: string;
      itemId: string;
      locationId?: string | null;
      vvmStatusId?: string | null;
      locationName?: string | null;
      onHold: boolean;
      packSize: number;
      sellPricePerPack: number;
      storeId: string;
      totalNumberOfPacks: number;
      supplierName?: string | null;
      volumePerPack: number;
      totalVolume: number;
      barcode?: string | null;
      location?: {
        __typename: 'LocationNode';
        id: string;
        name: string;
        onHold: boolean;
        code: string;
        volume: number;
        volumeUsed: number;
        locationType?: {
          __typename: 'LocationTypeNode';
          id: string;
          name: string;
          maxTemperature: number;
          minTemperature: number;
        } | null;
        stock: { __typename: 'StockLineConnector'; totalCount: number };
      } | null;
      item: {
        __typename: 'ItemNode';
        code: string;
        name: string;
        unitName?: string | null;
        isVaccine: boolean;
        restrictedLocationTypeId?: string | null;
        defaultPackSize: number;
        dosesPerUnit: number;
        masterLists?: Array<{
          __typename: 'MasterListNode';
          name: string;
        }> | null;
        itemStoreProperties?: {
          __typename: 'ItemStorePropertiesNode';
          defaultSellPricePerPack: number;
        } | null;
      };
      vvmStatusLogs?: {
        __typename: 'VvmstatusLogConnector';
        nodes: Array<{
          __typename: 'VvmstatusLogNode';
          id: string;
          createdDatetime: string;
          comment?: string | null;
          user?: {
            __typename: 'UserNode';
            firstName?: string | null;
            lastName?: string | null;
            username: string;
          } | null;
          status?: {
            __typename: 'VvmstatusNode';
            id: string;
            description: string;
            code: string;
            priority: number;
          } | null;
        }>;
      } | null;
      vvmStatus?: {
        __typename: 'VvmstatusNode';
        id: string;
        priority: number;
        unusable: boolean;
        description: string;
      } | null;
      donor?: { __typename: 'NameNode'; id: string } | null;
      program?: { __typename: 'ProgramNode'; id: string; name: string } | null;
      campaign?: {
        __typename: 'CampaignNode';
        id: string;
        name: string;
      } | null;
      itemVariant?: {
        __typename: 'ItemVariantNode';
        id: string;
        packagingVariants: Array<{
          __typename: 'PackagingVariantNode';
          id: string;
          packSize?: number | null;
          volumePerUnit?: number | null;
        }>;
      } | null;
    }>;
  };
};

export type StockLineQueryVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type StockLineQuery = {
  __typename: 'Queries';
  stockLines: {
    __typename: 'StockLineConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'StockLineNode';
      availableNumberOfPacks: number;
      batch?: string | null;
      costPricePerPack: number;
      expiryDate?: string | null;
      id: string;
      itemId: string;
      locationId?: string | null;
      vvmStatusId?: string | null;
      locationName?: string | null;
      onHold: boolean;
      packSize: number;
      sellPricePerPack: number;
      storeId: string;
      totalNumberOfPacks: number;
      supplierName?: string | null;
      volumePerPack: number;
      totalVolume: number;
      barcode?: string | null;
      location?: {
        __typename: 'LocationNode';
        id: string;
        name: string;
        onHold: boolean;
        code: string;
        volume: number;
        volumeUsed: number;
        locationType?: {
          __typename: 'LocationTypeNode';
          id: string;
          name: string;
          maxTemperature: number;
          minTemperature: number;
        } | null;
        stock: { __typename: 'StockLineConnector'; totalCount: number };
      } | null;
      item: {
        __typename: 'ItemNode';
        code: string;
        name: string;
        unitName?: string | null;
        isVaccine: boolean;
        restrictedLocationTypeId?: string | null;
        defaultPackSize: number;
        dosesPerUnit: number;
        masterLists?: Array<{
          __typename: 'MasterListNode';
          name: string;
        }> | null;
        itemStoreProperties?: {
          __typename: 'ItemStorePropertiesNode';
          defaultSellPricePerPack: number;
        } | null;
      };
      vvmStatusLogs?: {
        __typename: 'VvmstatusLogConnector';
        nodes: Array<{
          __typename: 'VvmstatusLogNode';
          id: string;
          createdDatetime: string;
          comment?: string | null;
          user?: {
            __typename: 'UserNode';
            firstName?: string | null;
            lastName?: string | null;
            username: string;
          } | null;
          status?: {
            __typename: 'VvmstatusNode';
            id: string;
            description: string;
            code: string;
            priority: number;
          } | null;
        }>;
      } | null;
      vvmStatus?: {
        __typename: 'VvmstatusNode';
        id: string;
        priority: number;
        unusable: boolean;
        description: string;
      } | null;
      donor?: { __typename: 'NameNode'; id: string } | null;
      program?: { __typename: 'ProgramNode'; id: string; name: string } | null;
      campaign?: {
        __typename: 'CampaignNode';
        id: string;
        name: string;
      } | null;
      itemVariant?: {
        __typename: 'ItemVariantNode';
        id: string;
        packagingVariants: Array<{
          __typename: 'PackagingVariantNode';
          id: string;
          packSize?: number | null;
          volumePerUnit?: number | null;
        }>;
      } | null;
    }>;
  };
};

export type StockLinesCountQueryVariables = Types.Exact<{
  filter?: Types.InputMaybe<Types.StockLineFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;

export type StockLinesCountQuery = {
  __typename: 'Queries';
  stockLines: { __typename: 'StockLineConnector'; totalCount: number };
};

export type LedgerQueryVariables = Types.Exact<{
  key: Types.LedgerSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.LedgerFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;

export type LedgerQuery = {
  __typename: 'Queries';
  ledger: {
    __typename: 'LedgerConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'LedgerNode';
      datetime: string;
      id: string;
      invoiceType: Types.InvoiceNodeType;
      invoiceNumber: number;
      itemId: string;
      name: string;
      quantity: number;
      reason?: string | null;
      stockLineId?: string | null;
      storeId: string;
      runningBalance: number;
    }>;
  };
};

export type UpdateStockLineMutationVariables = Types.Exact<{
  input: Types.UpdateStockLineInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type UpdateStockLineMutation = {
  __typename: 'Mutations';
  updateStockLine:
    | {
        __typename: 'StockLineNode';
        availableNumberOfPacks: number;
        batch?: string | null;
        costPricePerPack: number;
        expiryDate?: string | null;
        id: string;
        itemId: string;
        locationId?: string | null;
        vvmStatusId?: string | null;
        locationName?: string | null;
        onHold: boolean;
        packSize: number;
        sellPricePerPack: number;
        storeId: string;
        totalNumberOfPacks: number;
        supplierName?: string | null;
        volumePerPack: number;
        totalVolume: number;
        barcode?: string | null;
        location?: {
          __typename: 'LocationNode';
          id: string;
          name: string;
          onHold: boolean;
          code: string;
          volume: number;
          volumeUsed: number;
          locationType?: {
            __typename: 'LocationTypeNode';
            id: string;
            name: string;
            maxTemperature: number;
            minTemperature: number;
          } | null;
          stock: { __typename: 'StockLineConnector'; totalCount: number };
        } | null;
        item: {
          __typename: 'ItemNode';
          code: string;
          name: string;
          unitName?: string | null;
          isVaccine: boolean;
          restrictedLocationTypeId?: string | null;
          defaultPackSize: number;
          dosesPerUnit: number;
          masterLists?: Array<{
            __typename: 'MasterListNode';
            name: string;
          }> | null;
          itemStoreProperties?: {
            __typename: 'ItemStorePropertiesNode';
            defaultSellPricePerPack: number;
          } | null;
        };
        vvmStatusLogs?: {
          __typename: 'VvmstatusLogConnector';
          nodes: Array<{
            __typename: 'VvmstatusLogNode';
            id: string;
            createdDatetime: string;
            comment?: string | null;
            user?: {
              __typename: 'UserNode';
              firstName?: string | null;
              lastName?: string | null;
              username: string;
            } | null;
            status?: {
              __typename: 'VvmstatusNode';
              id: string;
              description: string;
              code: string;
              priority: number;
            } | null;
          }>;
        } | null;
        vvmStatus?: {
          __typename: 'VvmstatusNode';
          id: string;
          priority: number;
          unusable: boolean;
          description: string;
        } | null;
        donor?: { __typename: 'NameNode'; id: string } | null;
        program?: {
          __typename: 'ProgramNode';
          id: string;
          name: string;
        } | null;
        campaign?: {
          __typename: 'CampaignNode';
          id: string;
          name: string;
        } | null;
        itemVariant?: {
          __typename: 'ItemVariantNode';
          id: string;
          packagingVariants: Array<{
            __typename: 'PackagingVariantNode';
            id: string;
            packSize?: number | null;
            volumePerUnit?: number | null;
          }>;
        } | null;
      }
    | { __typename: 'UpdateStockLineError' };
};

export type RepackQueryVariables = Types.Exact<{
  invoiceId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type RepackQuery = {
  __typename: 'Queries';
  repack:
    | { __typename: 'NodeError' }
    | {
        __typename: 'RepackNode';
        id: string;
        datetime: string;
        repackId: string;
        from: {
          __typename: 'RepackStockLineNode';
          packSize: number;
          numberOfPacks: number;
          location?: {
            __typename: 'LocationNode';
            id: string;
            name: string;
            onHold: boolean;
            code: string;
            volume: number;
            volumeUsed: number;
            locationType?: {
              __typename: 'LocationTypeNode';
              id: string;
              name: string;
              maxTemperature: number;
              minTemperature: number;
            } | null;
            stock: { __typename: 'StockLineConnector'; totalCount: number };
          } | null;
        };
        to: {
          __typename: 'RepackStockLineNode';
          packSize: number;
          numberOfPacks: number;
          location?: {
            __typename: 'LocationNode';
            id: string;
            name: string;
            onHold: boolean;
            code: string;
            volume: number;
            volumeUsed: number;
            locationType?: {
              __typename: 'LocationTypeNode';
              id: string;
              name: string;
              maxTemperature: number;
              minTemperature: number;
            } | null;
            stock: { __typename: 'StockLineConnector'; totalCount: number };
          } | null;
        };
      };
};

export type RepacksByStockLineQueryVariables = Types.Exact<{
  stockLineId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type RepacksByStockLineQuery = {
  __typename: 'Queries';
  repacksByStockLine: {
    __typename: 'RepackConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'RepackNode';
      id: string;
      datetime: string;
      repackId: string;
      from: {
        __typename: 'RepackStockLineNode';
        packSize: number;
        numberOfPacks: number;
        location?: {
          __typename: 'LocationNode';
          id: string;
          name: string;
          onHold: boolean;
          code: string;
          volume: number;
          volumeUsed: number;
          locationType?: {
            __typename: 'LocationTypeNode';
            id: string;
            name: string;
            maxTemperature: number;
            minTemperature: number;
          } | null;
          stock: { __typename: 'StockLineConnector'; totalCount: number };
        } | null;
      };
      to: {
        __typename: 'RepackStockLineNode';
        packSize: number;
        numberOfPacks: number;
        location?: {
          __typename: 'LocationNode';
          id: string;
          name: string;
          onHold: boolean;
          code: string;
          volume: number;
          volumeUsed: number;
          locationType?: {
            __typename: 'LocationTypeNode';
            id: string;
            name: string;
            maxTemperature: number;
            minTemperature: number;
          } | null;
          stock: { __typename: 'StockLineConnector'; totalCount: number };
        } | null;
      };
    }>;
  };
};

export type VvmStatusQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;

export type VvmStatusQuery = {
  __typename: 'Queries';
  activeVvmStatuses: {
    __typename: 'VvmstatusConnector';
    nodes: Array<{
      __typename: 'VvmstatusNode';
      description: string;
      id: string;
      priority: number;
      reasonId?: string | null;
      unusable: boolean;
    }>;
  };
};

export type InsertRepackMutationVariables = Types.Exact<{
  input: Types.InsertRepackInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type InsertRepackMutation = {
  __typename: 'Mutations';
  insertRepack:
    | {
        __typename: 'InsertRepackError';
        error:
          | { __typename: 'CannotHaveFractionalPack'; description: string }
          | { __typename: 'StockLineReducedBelowZero'; description: string };
      }
    | {
        __typename: 'InvoiceNode';
        id: string;
        lines: {
          __typename: 'InvoiceLineConnector';
          nodes: Array<{
            __typename: 'InvoiceLineNode';
            id: string;
            itemName: string;
            numberOfPacks: number;
            itemCode: string;
            stockLine?: { __typename: 'StockLineNode'; id: string } | null;
          }>;
        };
      };
};

export type CreateInventoryAdjustmentMutationVariables = Types.Exact<{
  input: Types.CreateInventoryAdjustmentInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type CreateInventoryAdjustmentMutation = {
  __typename: 'Mutations';
  createInventoryAdjustment:
    | {
        __typename: 'CreateInventoryAdjustmentError';
        error:
          | { __typename: 'AdjustmentReasonNotProvided'; description: string }
          | { __typename: 'StockLineReducedBelowZero'; description: string };
      }
    | {
        __typename: 'InvoiceNode';
        id: string;
        lines: {
          __typename: 'InvoiceLineConnector';
          nodes: Array<{
            __typename: 'InvoiceLineNode';
            id: string;
            itemName: string;
            numberOfPacks: number;
            itemCode: string;
            stockLine?: { __typename: 'StockLineNode'; id: string } | null;
          }>;
        };
      };
};

export type InsertStockLineMutationVariables = Types.Exact<{
  input: Types.InsertStockLineInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type InsertStockLineMutation = {
  __typename: 'Mutations';
  insertStockLine:
    | {
        __typename: 'InsertStockLineError';
        error: { __typename: 'AdjustmentReasonNotProvided' };
      }
    | {
        __typename: 'StockLineNode';
        availableNumberOfPacks: number;
        batch?: string | null;
        costPricePerPack: number;
        expiryDate?: string | null;
        id: string;
        itemId: string;
        locationId?: string | null;
        vvmStatusId?: string | null;
        locationName?: string | null;
        onHold: boolean;
        packSize: number;
        sellPricePerPack: number;
        storeId: string;
        totalNumberOfPacks: number;
        supplierName?: string | null;
        volumePerPack: number;
        totalVolume: number;
        barcode?: string | null;
        location?: {
          __typename: 'LocationNode';
          id: string;
          name: string;
          onHold: boolean;
          code: string;
          volume: number;
          volumeUsed: number;
          locationType?: {
            __typename: 'LocationTypeNode';
            id: string;
            name: string;
            maxTemperature: number;
            minTemperature: number;
          } | null;
          stock: { __typename: 'StockLineConnector'; totalCount: number };
        } | null;
        item: {
          __typename: 'ItemNode';
          code: string;
          name: string;
          unitName?: string | null;
          isVaccine: boolean;
          restrictedLocationTypeId?: string | null;
          defaultPackSize: number;
          dosesPerUnit: number;
          masterLists?: Array<{
            __typename: 'MasterListNode';
            name: string;
          }> | null;
          itemStoreProperties?: {
            __typename: 'ItemStorePropertiesNode';
            defaultSellPricePerPack: number;
          } | null;
        };
        vvmStatusLogs?: {
          __typename: 'VvmstatusLogConnector';
          nodes: Array<{
            __typename: 'VvmstatusLogNode';
            id: string;
            createdDatetime: string;
            comment?: string | null;
            user?: {
              __typename: 'UserNode';
              firstName?: string | null;
              lastName?: string | null;
              username: string;
            } | null;
            status?: {
              __typename: 'VvmstatusNode';
              id: string;
              description: string;
              code: string;
              priority: number;
            } | null;
          }>;
        } | null;
        vvmStatus?: {
          __typename: 'VvmstatusNode';
          id: string;
          priority: number;
          unusable: boolean;
          description: string;
        } | null;
        donor?: { __typename: 'NameNode'; id: string } | null;
        program?: {
          __typename: 'ProgramNode';
          id: string;
          name: string;
        } | null;
        campaign?: {
          __typename: 'CampaignNode';
          id: string;
          name: string;
        } | null;
        itemVariant?: {
          __typename: 'ItemVariantNode';
          id: string;
          packagingVariants: Array<{
            __typename: 'PackagingVariantNode';
            id: string;
            packSize?: number | null;
            volumePerUnit?: number | null;
          }>;
        } | null;
      };
};

export type VvmStatusFragment = {
  __typename: 'VvmstatusNode';
  description: string;
  id: string;
  priority: number;
  reasonId?: string | null;
  unusable: boolean;
};

export type ActiveVvmStatusesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;

export type ActiveVvmStatusesQuery = {
  __typename: 'Queries';
  activeVvmStatuses: {
    __typename: 'VvmstatusConnector';
    nodes: Array<{
      __typename: 'VvmstatusNode';
      description: string;
      id: string;
      priority: number;
      reasonId?: string | null;
      unusable: boolean;
    }>;
  };
};

export type InsertVvmStatusLogMutationVariables = Types.Exact<{
  input: Types.InsertVvmStatusLogInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type InsertVvmStatusLogMutation = {
  __typename: 'Mutations';
  insertVvmStatusLog: {
    __typename: 'VvmstatusLogNode';
    id: string;
    status?: { __typename: 'VvmstatusNode'; id: string; code: string } | null;
  };
};

export type UpdateVvmStatusLogMutationVariables = Types.Exact<{
  input: Types.UpdateVvmStatusLogInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type UpdateVvmStatusLogMutation = {
  __typename: 'Mutations';
  updateVvmStatusLog: { __typename: 'IdResponse'; id: string };
};

export const VvmStatusLogRowFragmentDoc = gql`
  fragment VVMStatusLogRow on VvmstatusLogNode {
    id
    createdDatetime
    user {
      firstName
      lastName
      username
    }
    status {
      id
      description
      code
      priority
    }
    createdDatetime
    comment
  }
`;
export const StockLineRowFragmentDoc = gql`
  fragment StockLineRow on StockLineNode {
    availableNumberOfPacks
    batch
    costPricePerPack
    expiryDate
    id
    itemId
    locationId
    vvmStatusId
    locationName
    onHold
    packSize
    sellPricePerPack
    storeId
    totalNumberOfPacks
    supplierName
    volumePerPack
    totalVolume
    location {
      ...LocationRow
    }
    item {
      code
      name
      unitName
      masterLists(storeId: $storeId) {
        name
      }
      isVaccine
      dosesPerUnit: doses
      restrictedLocationTypeId
      defaultPackSize
      itemStoreProperties(storeId: $storeId) {
        defaultSellPricePerPack
      }
    }
    barcode
    vvmStatusLogs {
      nodes {
        ...VVMStatusLogRow
      }
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
    }
    program {
      id
      name
    }
    campaign {
      id
      name
    }
    itemVariant {
      __typename
      id
      packagingVariants {
        __typename
        id
        packSize
        volumePerUnit
      }
    }
  }
  ${LocationRowFragmentDoc}
  ${VvmStatusLogRowFragmentDoc}
`;
export const RepackStockLineFragmentDoc = gql`
  fragment RepackStockLine on RepackStockLineNode {
    location {
      ...LocationRow
    }
    packSize
    numberOfPacks
  }
  ${LocationRowFragmentDoc}
`;
export const RepackFragmentDoc = gql`
  fragment Repack on RepackNode {
    id
    datetime
    repackId
    from {
      ...RepackStockLine
    }
    to {
      ...RepackStockLine
    }
  }
  ${RepackStockLineFragmentDoc}
`;
export const InvoiceRowFragmentDoc = gql`
  fragment InvoiceRow on InvoiceNode {
    id
    lines {
      nodes {
        id
        itemName
        numberOfPacks
        itemCode
        stockLine {
          id
        }
      }
    }
  }
`;
export const LedgerRowFragmentDoc = gql`
  fragment LedgerRow on LedgerNode {
    datetime
    id
    invoiceType
    invoiceNumber
    itemId
    name
    quantity
    reason
    stockLineId
    storeId
    runningBalance
  }
`;
export const VvmStatusFragmentDoc = gql`
  fragment VVMStatus on VvmstatusNode {
    __typename
    description
    id
    priority
    reasonId
    unusable
  }
`;
export const StockLinesDocument = gql`
  query stockLines(
    $first: Int
    $offset: Int
    $key: StockLineSortFieldInput!
    $desc: Boolean
    $filter: StockLineFilterInput
    $storeId: String!
  ) {
    stockLines(
      storeId: $storeId
      filter: $filter
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
    ) {
      ... on StockLineConnector {
        __typename
        nodes {
          __typename
          ...StockLineRow
        }
        totalCount
      }
    }
  }
  ${StockLineRowFragmentDoc}
`;
export const StockLineDocument = gql`
  query stockLine($id: String!, $storeId: String!) {
    stockLines(storeId: $storeId, filter: { id: { equalTo: $id } }) {
      ... on StockLineConnector {
        __typename
        nodes {
          __typename
          ...StockLineRow
        }
        totalCount
      }
    }
  }
  ${StockLineRowFragmentDoc}
`;
export const StockLinesCountDocument = gql`
  query stockLinesCount($filter: StockLineFilterInput, $storeId: String!) {
    stockLines(storeId: $storeId, filter: $filter) {
      ... on StockLineConnector {
        __typename
        totalCount
      }
    }
  }
`;
export const LedgerDocument = gql`
  query ledger(
    $key: LedgerSortFieldInput!
    $desc: Boolean
    $filter: LedgerFilterInput
    $storeId: String!
  ) {
    ledger(
      storeId: $storeId
      filter: $filter
      sort: { key: $key, desc: $desc }
    ) {
      ... on LedgerConnector {
        __typename
        nodes {
          __typename
          ...LedgerRow
        }
        totalCount
      }
    }
  }
  ${LedgerRowFragmentDoc}
`;
export const UpdateStockLineDocument = gql`
  mutation updateStockLine($input: UpdateStockLineInput!, $storeId: String!) {
    updateStockLine(input: $input, storeId: $storeId) {
      ... on StockLineNode {
        __typename
        ...StockLineRow
      }
    }
  }
  ${StockLineRowFragmentDoc}
`;
export const RepackDocument = gql`
  query repack($invoiceId: String!, $storeId: String!) {
    repack(invoiceId: $invoiceId, storeId: $storeId) {
      ... on RepackNode {
        __typename
        ...Repack
      }
    }
  }
  ${RepackFragmentDoc}
`;
export const RepacksByStockLineDocument = gql`
  query repacksByStockLine($stockLineId: String!, $storeId: String!) {
    repacksByStockLine(stockLineId: $stockLineId, storeId: $storeId) {
      ... on RepackConnector {
        nodes {
          ...Repack
        }
        totalCount
      }
    }
  }
  ${RepackFragmentDoc}
`;
export const VvmStatusDocument = gql`
  query vvmStatus($storeId: String!) {
    activeVvmStatuses(storeId: $storeId) {
      ... on VvmstatusConnector {
        __typename
        nodes {
          __typename
          ...VVMStatus
        }
      }
    }
  }
  ${VvmStatusFragmentDoc}
`;
export const InsertRepackDocument = gql`
  mutation insertRepack($input: InsertRepackInput!, $storeId: String!) {
    insertRepack(input: $input, storeId: $storeId) {
      ... on InvoiceNode {
        __typename
        ...InvoiceRow
      }
      ... on InsertRepackError {
        __typename
        error {
          description
          ... on StockLineReducedBelowZero {
            __typename
            description
          }
          ... on CannotHaveFractionalPack {
            __typename
            description
          }
        }
      }
    }
  }
  ${InvoiceRowFragmentDoc}
`;
export const CreateInventoryAdjustmentDocument = gql`
  mutation createInventoryAdjustment(
    $input: CreateInventoryAdjustmentInput!
    $storeId: String!
  ) {
    createInventoryAdjustment(input: $input, storeId: $storeId) {
      __typename
      ... on InvoiceNode {
        __typename
        ...InvoiceRow
      }
      ... on CreateInventoryAdjustmentError {
        __typename
        error {
          __typename
          description
          ... on StockLineReducedBelowZero {
            __typename
            description
          }
          ... on AdjustmentReasonNotProvided {
            __typename
            description
          }
        }
      }
    }
  }
  ${InvoiceRowFragmentDoc}
`;
export const InsertStockLineDocument = gql`
  mutation insertStockLine($input: InsertStockLineInput!, $storeId: String!) {
    insertStockLine(input: $input, storeId: $storeId) {
      ... on StockLineNode {
        __typename
        ...StockLineRow
      }
      ... on InsertStockLineError {
        __typename
        error {
          __typename
          ... on AdjustmentReasonNotProvided {
            __typename
          }
        }
      }
    }
  }
  ${StockLineRowFragmentDoc}
`;
export const ActiveVvmStatusesDocument = gql`
  query activeVvmStatuses($storeId: String!) {
    activeVvmStatuses(storeId: $storeId) {
      ... on VvmstatusConnector {
        __typename
        nodes {
          ...VVMStatus
        }
      }
    }
  }
  ${VvmStatusFragmentDoc}
`;
export const InsertVvmStatusLogDocument = gql`
  mutation insertVvmStatusLog(
    $input: InsertVVMStatusLogInput!
    $storeId: String!
  ) {
    insertVvmStatusLog(input: $input, storeId: $storeId) {
      ... on VvmstatusLogNode {
        id
        status {
          id
          code
        }
      }
    }
  }
`;
export const UpdateVvmStatusLogDocument = gql`
  mutation updateVvmStatusLog(
    $input: UpdateVVMStatusLogInput!
    $storeId: String!
  ) {
    updateVvmStatusLog(input: $input, storeId: $storeId) {
      ... on IdResponse {
        id
      }
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
    stockLines(
      variables: StockLinesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<StockLinesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<StockLinesQuery>(StockLinesDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'stockLines',
        'query',
        variables
      );
    },
    stockLine(
      variables: StockLineQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<StockLineQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<StockLineQuery>(StockLineDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'stockLine',
        'query',
        variables
      );
    },
    stockLinesCount(
      variables: StockLinesCountQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<StockLinesCountQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<StockLinesCountQuery>(
            StockLinesCountDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'stockLinesCount',
        'query',
        variables
      );
    },
    ledger(
      variables: LedgerQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<LedgerQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<LedgerQuery>(LedgerDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'ledger',
        'query',
        variables
      );
    },
    updateStockLine(
      variables: UpdateStockLineMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<UpdateStockLineMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateStockLineMutation>(
            UpdateStockLineDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'updateStockLine',
        'mutation',
        variables
      );
    },
    repack(
      variables: RepackQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<RepackQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<RepackQuery>(RepackDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'repack',
        'query',
        variables
      );
    },
    repacksByStockLine(
      variables: RepacksByStockLineQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<RepacksByStockLineQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<RepacksByStockLineQuery>(
            RepacksByStockLineDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'repacksByStockLine',
        'query',
        variables
      );
    },
    vvmStatus(
      variables: VvmStatusQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<VvmStatusQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<VvmStatusQuery>(VvmStatusDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'vvmStatus',
        'query',
        variables
      );
    },
    insertRepack(
      variables: InsertRepackMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InsertRepackMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertRepackMutation>(
            InsertRepackDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertRepack',
        'mutation',
        variables
      );
    },
    createInventoryAdjustment(
      variables: CreateInventoryAdjustmentMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<CreateInventoryAdjustmentMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<CreateInventoryAdjustmentMutation>(
            CreateInventoryAdjustmentDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'createInventoryAdjustment',
        'mutation',
        variables
      );
    },
    insertStockLine(
      variables: InsertStockLineMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InsertStockLineMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertStockLineMutation>(
            InsertStockLineDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertStockLine',
        'mutation',
        variables
      );
    },
    activeVvmStatuses(
      variables: ActiveVvmStatusesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<ActiveVvmStatusesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ActiveVvmStatusesQuery>(
            ActiveVvmStatusesDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'activeVvmStatuses',
        'query',
        variables
      );
    },
    insertVvmStatusLog(
      variables: InsertVvmStatusLogMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InsertVvmStatusLogMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertVvmStatusLogMutation>(
            InsertVvmStatusLogDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertVvmStatusLog',
        'mutation',
        variables
      );
    },
    updateVvmStatusLog(
      variables: UpdateVvmStatusLogMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<UpdateVvmStatusLogMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateVvmStatusLogMutation>(
            UpdateVvmStatusLogDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'updateVvmStatusLog',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
