import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
import { NameRowFragmentDoc } from '../../Name/api/operations.generated';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type StockLineFragment = {
  __typename: 'StockLineNode';
  availableNumberOfPacks: number;
  batch?: string | null;
  expiryDate?: string | null;
  id: string;
  itemId: string;
  note?: string | null;
  onHold: boolean;
  packSize: number;
  sellPricePerPack: number;
  costPricePerPack: number;
  storeId: string;
  totalNumberOfPacks: number;
  itemVariantId?: string | null;
  volumePerPack: number;
  location?: {
    __typename: 'LocationNode';
    code: string;
    id: string;
    name: string;
    onHold: boolean;
    locationType?: {
      __typename: 'LocationTypeNode';
      id: string;
      name: string;
    } | null;
  } | null;
  item: {
    __typename: 'ItemNode';
    name: string;
    code: string;
    unitName?: string | null;
    defaultPackSize: number;
    doses: number;
    isVaccine: boolean;
    restrictedLocationTypeId?: string | null;
    itemDirections: Array<{
      __typename: 'ItemDirectionNode';
      directions: string;
      id: string;
      itemId: string;
      priority: number;
    }>;
    warnings: Array<{
      __typename: 'WarningNode';
      warningText: string;
      id: string;
      itemId: string;
      priority: boolean;
      code: string;
    }>;
  };
  donor?: { __typename: 'NameNode'; id: string } | null;
  vvmStatus?: {
    __typename: 'VvmstatusNode';
    id: string;
    priority: number;
    unusable: boolean;
    description: string;
  } | null;
  program?: { __typename: 'ProgramNode'; id: string; name: string } | null;
  campaign?: { __typename: 'CampaignNode'; id: string; name: string } | null;
};

export type ItemRowFragment = {
  __typename: 'ItemNode';
  id: string;
  code: string;
  name: string;
  unitName?: string | null;
  isVaccine: boolean;
  doses: number;
  restrictedLocationTypeId?: string | null;
};

export type ItemDirectionFragment = {
  __typename: 'ItemDirectionNode';
  directions: string;
  id: string;
  itemId: string;
  priority: number;
};

export type ItemRowWithWarningsFragment = {
  __typename: 'ItemNode';
  id: string;
  code: string;
  name: string;
  unitName?: string | null;
  isVaccine: boolean;
  doses: number;
  restrictedLocationTypeId?: string | null;
  warnings: Array<{
    __typename: 'WarningNode';
    warningText: string;
    id: string;
    itemId: string;
    priority: boolean;
    code: string;
  }>;
};

export type WarningFragment = {
  __typename: 'WarningNode';
  warningText: string;
  id: string;
  itemId: string;
  priority: boolean;
  code: string;
};

export type ItemWithPackSizeFragment = {
  __typename: 'ItemNode';
  defaultPackSize: number;
  id: string;
  code: string;
  name: string;
  unitName?: string | null;
  isVaccine: boolean;
  doses: number;
  restrictedLocationTypeId?: string | null;
};

export type ItemStockOnHandFragment = {
  __typename: 'ItemNode';
  availableStockOnHand: number;
  defaultPackSize: number;
  id: string;
  code: string;
  name: string;
  unitName?: string | null;
  isVaccine: boolean;
  doses: number;
  restrictedLocationTypeId?: string | null;
  itemStoreProperties?: {
    __typename: 'ItemStorePropertiesNode';
    defaultSellPricePerPack: number;
    ignoreForOrders: boolean;
  } | null;
  stats: { __typename: 'ItemStatsNode'; stockOnHand: number };
};

export type ItemRowWithStatsFragment = {
  __typename: 'ItemNode';
  availableStockOnHand: number;
  defaultPackSize: number;
  id: string;
  code: string;
  name: string;
  unitName?: string | null;
  isVaccine: boolean;
  doses: number;
  restrictedLocationTypeId?: string | null;
  stats: {
    __typename: 'ItemStatsNode';
    averageMonthlyConsumption: number;
    availableStockOnHand: number;
    availableMonthsOfStockOnHand?: number | null;
    monthsOfStockOnHand?: number | null;
    totalConsumption: number;
    stockOnHand: number;
  };
  itemStoreProperties?: {
    __typename: 'ItemStorePropertiesNode';
    defaultSellPricePerPack: number;
    ignoreForOrders: boolean;
  } | null;
};

export type LocationTypeFragment = {
  __typename: 'LocationTypeNode';
  id: string;
  name: string;
  minTemperature: number;
  maxTemperature: number;
};

export type PackagingVariantFragment = {
  __typename: 'PackagingVariantNode';
  id: string;
  name: string;
  packagingLevel: number;
  packSize?: number | null;
  volumePerUnit?: number | null;
};

export type BundledItemVariantFragment = {
  __typename: 'ItemVariantNode';
  id: string;
  name: string;
  itemId: string;
  itemName: string;
};

export type BundledItemFragment = {
  __typename: 'BundledItemNode';
  id: string;
  ratio: number;
  principalItemVariant?: {
    __typename: 'ItemVariantNode';
    id: string;
    name: string;
    itemId: string;
    itemName: string;
  } | null;
  bundledItemVariant?: {
    __typename: 'ItemVariantNode';
    id: string;
    name: string;
    itemId: string;
    itemName: string;
  } | null;
};

export type ItemVariantFragment = {
  __typename: 'ItemVariantNode';
  id: string;
  name: string;
  itemId: string;
  manufacturerId?: string | null;
  locationTypeId?: string | null;
  vvmType?: string | null;
  item?: {
    __typename: 'ItemNode';
    id: string;
    name: string;
    isVaccine: boolean;
    restrictedLocationTypeId?: string | null;
  } | null;
  manufacturer?: {
    __typename: 'NameNode';
    code: string;
    id: string;
    isCustomer: boolean;
    isSupplier: boolean;
    isOnHold: boolean;
    name: string;
    store?: { __typename: 'StoreNode'; id: string; code: string } | null;
  } | null;
  locationType?: {
    __typename: 'LocationTypeNode';
    id: string;
    name: string;
    minTemperature: number;
    maxTemperature: number;
  } | null;
  packagingVariants: Array<{
    __typename: 'PackagingVariantNode';
    id: string;
    name: string;
    packagingLevel: number;
    packSize?: number | null;
    volumePerUnit?: number | null;
  }>;
  bundledItemVariants: Array<{
    __typename: 'BundledItemNode';
    id: string;
    ratio: number;
    principalItemVariant?: {
      __typename: 'ItemVariantNode';
      id: string;
      name: string;
      itemId: string;
      itemName: string;
    } | null;
    bundledItemVariant?: {
      __typename: 'ItemVariantNode';
      id: string;
      name: string;
      itemId: string;
      itemName: string;
    } | null;
  }>;
  bundlesWith: Array<{
    __typename: 'BundledItemNode';
    id: string;
    ratio: number;
    principalItemVariant?: {
      __typename: 'ItemVariantNode';
      id: string;
      name: string;
      itemId: string;
      itemName: string;
    } | null;
    bundledItemVariant?: {
      __typename: 'ItemVariantNode';
      id: string;
      name: string;
      itemId: string;
      itemName: string;
    } | null;
  }>;
};

export type ItemFragment = {
  __typename: 'ItemNode';
  id: string;
  code: string;
  name: string;
  atcCategory: string;
  ddd: string;
  defaultPackSize: number;
  doses: number;
  isVaccine: boolean;
  margin: number;
  msupplyUniversalCode: string;
  msupplyUniversalName: string;
  outerPackSize: number;
  strength?: string | null;
  type: Types.ItemNodeType;
  unitName?: string | null;
  volumePerOuterPack: number;
  volumePerPack: number;
  weight: number;
  restrictedLocationTypeId?: string | null;
  availableStockOnHand: number;
  restrictedLocationType?: {
    __typename: 'LocationTypeNode';
    id: string;
    name: string;
    minTemperature: number;
    maxTemperature: number;
  } | null;
  availableBatches: {
    __typename: 'StockLineConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'StockLineNode';
      availableNumberOfPacks: number;
      batch?: string | null;
      expiryDate?: string | null;
      id: string;
      itemId: string;
      note?: string | null;
      onHold: boolean;
      packSize: number;
      sellPricePerPack: number;
      costPricePerPack: number;
      storeId: string;
      totalNumberOfPacks: number;
      itemVariantId?: string | null;
      volumePerPack: number;
      location?: {
        __typename: 'LocationNode';
        code: string;
        id: string;
        name: string;
        onHold: boolean;
        locationType?: {
          __typename: 'LocationTypeNode';
          id: string;
          name: string;
        } | null;
      } | null;
      item: {
        __typename: 'ItemNode';
        name: string;
        code: string;
        unitName?: string | null;
        defaultPackSize: number;
        doses: number;
        isVaccine: boolean;
        restrictedLocationTypeId?: string | null;
        itemDirections: Array<{
          __typename: 'ItemDirectionNode';
          directions: string;
          id: string;
          itemId: string;
          priority: number;
        }>;
        warnings: Array<{
          __typename: 'WarningNode';
          warningText: string;
          id: string;
          itemId: string;
          priority: boolean;
          code: string;
        }>;
      };
      donor?: { __typename: 'NameNode'; id: string } | null;
      vvmStatus?: {
        __typename: 'VvmstatusNode';
        id: string;
        priority: number;
        unusable: boolean;
        description: string;
      } | null;
      program?: { __typename: 'ProgramNode'; id: string; name: string } | null;
      campaign?: {
        __typename: 'CampaignNode';
        id: string;
        name: string;
      } | null;
    }>;
  };
  stats: {
    __typename: 'ItemStatsNode';
    averageMonthlyConsumption: number;
    availableStockOnHand: number;
    availableMonthsOfStockOnHand?: number | null;
    monthsOfStockOnHand?: number | null;
    totalConsumption: number;
    stockOnHand: number;
  };
  variants: Array<{
    __typename: 'ItemVariantNode';
    id: string;
    name: string;
    itemId: string;
    manufacturerId?: string | null;
    locationTypeId?: string | null;
    vvmType?: string | null;
    item?: {
      __typename: 'ItemNode';
      id: string;
      name: string;
      isVaccine: boolean;
      restrictedLocationTypeId?: string | null;
    } | null;
    manufacturer?: {
      __typename: 'NameNode';
      code: string;
      id: string;
      isCustomer: boolean;
      isSupplier: boolean;
      isOnHold: boolean;
      name: string;
      store?: { __typename: 'StoreNode'; id: string; code: string } | null;
    } | null;
    locationType?: {
      __typename: 'LocationTypeNode';
      id: string;
      name: string;
      minTemperature: number;
      maxTemperature: number;
    } | null;
    packagingVariants: Array<{
      __typename: 'PackagingVariantNode';
      id: string;
      name: string;
      packagingLevel: number;
      packSize?: number | null;
      volumePerUnit?: number | null;
    }>;
    bundledItemVariants: Array<{
      __typename: 'BundledItemNode';
      id: string;
      ratio: number;
      principalItemVariant?: {
        __typename: 'ItemVariantNode';
        id: string;
        name: string;
        itemId: string;
        itemName: string;
      } | null;
      bundledItemVariant?: {
        __typename: 'ItemVariantNode';
        id: string;
        name: string;
        itemId: string;
        itemName: string;
      } | null;
    }>;
    bundlesWith: Array<{
      __typename: 'BundledItemNode';
      id: string;
      ratio: number;
      principalItemVariant?: {
        __typename: 'ItemVariantNode';
        id: string;
        name: string;
        itemId: string;
        itemName: string;
      } | null;
      bundledItemVariant?: {
        __typename: 'ItemVariantNode';
        id: string;
        name: string;
        itemId: string;
        itemName: string;
      } | null;
    }>;
  }>;
  itemDirections: Array<{
    __typename: 'ItemDirectionNode';
    directions: string;
    id: string;
    itemId: string;
    priority: number;
  }>;
  itemStoreProperties?: {
    __typename: 'ItemStorePropertiesNode';
    defaultSellPricePerPack: number;
    ignoreForOrders: boolean;
  } | null;
};

export type ItemsWithStockLinesQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.ItemSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.ItemFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;

export type ItemsWithStockLinesQuery = {
  __typename: 'Queries';
  items: {
    __typename: 'ItemConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'ItemNode';
      id: string;
      code: string;
      name: string;
      atcCategory: string;
      ddd: string;
      defaultPackSize: number;
      doses: number;
      isVaccine: boolean;
      margin: number;
      msupplyUniversalCode: string;
      msupplyUniversalName: string;
      outerPackSize: number;
      strength?: string | null;
      type: Types.ItemNodeType;
      unitName?: string | null;
      volumePerOuterPack: number;
      volumePerPack: number;
      weight: number;
      restrictedLocationTypeId?: string | null;
      availableStockOnHand: number;
      restrictedLocationType?: {
        __typename: 'LocationTypeNode';
        id: string;
        name: string;
        minTemperature: number;
        maxTemperature: number;
      } | null;
      availableBatches: {
        __typename: 'StockLineConnector';
        totalCount: number;
        nodes: Array<{
          __typename: 'StockLineNode';
          availableNumberOfPacks: number;
          batch?: string | null;
          expiryDate?: string | null;
          id: string;
          itemId: string;
          note?: string | null;
          onHold: boolean;
          packSize: number;
          sellPricePerPack: number;
          costPricePerPack: number;
          storeId: string;
          totalNumberOfPacks: number;
          itemVariantId?: string | null;
          volumePerPack: number;
          location?: {
            __typename: 'LocationNode';
            code: string;
            id: string;
            name: string;
            onHold: boolean;
            locationType?: {
              __typename: 'LocationTypeNode';
              id: string;
              name: string;
            } | null;
          } | null;
          item: {
            __typename: 'ItemNode';
            name: string;
            code: string;
            unitName?: string | null;
            defaultPackSize: number;
            doses: number;
            isVaccine: boolean;
            restrictedLocationTypeId?: string | null;
            itemDirections: Array<{
              __typename: 'ItemDirectionNode';
              directions: string;
              id: string;
              itemId: string;
              priority: number;
            }>;
            warnings: Array<{
              __typename: 'WarningNode';
              warningText: string;
              id: string;
              itemId: string;
              priority: boolean;
              code: string;
            }>;
          };
          donor?: { __typename: 'NameNode'; id: string } | null;
          vvmStatus?: {
            __typename: 'VvmstatusNode';
            id: string;
            priority: number;
            unusable: boolean;
            description: string;
          } | null;
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
        }>;
      };
      stats: {
        __typename: 'ItemStatsNode';
        averageMonthlyConsumption: number;
        availableStockOnHand: number;
        availableMonthsOfStockOnHand?: number | null;
        monthsOfStockOnHand?: number | null;
        totalConsumption: number;
        stockOnHand: number;
      };
      variants: Array<{
        __typename: 'ItemVariantNode';
        id: string;
        name: string;
        itemId: string;
        manufacturerId?: string | null;
        locationTypeId?: string | null;
        vvmType?: string | null;
        item?: {
          __typename: 'ItemNode';
          id: string;
          name: string;
          isVaccine: boolean;
          restrictedLocationTypeId?: string | null;
        } | null;
        manufacturer?: {
          __typename: 'NameNode';
          code: string;
          id: string;
          isCustomer: boolean;
          isSupplier: boolean;
          isOnHold: boolean;
          name: string;
          store?: { __typename: 'StoreNode'; id: string; code: string } | null;
        } | null;
        locationType?: {
          __typename: 'LocationTypeNode';
          id: string;
          name: string;
          minTemperature: number;
          maxTemperature: number;
        } | null;
        packagingVariants: Array<{
          __typename: 'PackagingVariantNode';
          id: string;
          name: string;
          packagingLevel: number;
          packSize?: number | null;
          volumePerUnit?: number | null;
        }>;
        bundledItemVariants: Array<{
          __typename: 'BundledItemNode';
          id: string;
          ratio: number;
          principalItemVariant?: {
            __typename: 'ItemVariantNode';
            id: string;
            name: string;
            itemId: string;
            itemName: string;
          } | null;
          bundledItemVariant?: {
            __typename: 'ItemVariantNode';
            id: string;
            name: string;
            itemId: string;
            itemName: string;
          } | null;
        }>;
        bundlesWith: Array<{
          __typename: 'BundledItemNode';
          id: string;
          ratio: number;
          principalItemVariant?: {
            __typename: 'ItemVariantNode';
            id: string;
            name: string;
            itemId: string;
            itemName: string;
          } | null;
          bundledItemVariant?: {
            __typename: 'ItemVariantNode';
            id: string;
            name: string;
            itemId: string;
            itemName: string;
          } | null;
        }>;
      }>;
      itemDirections: Array<{
        __typename: 'ItemDirectionNode';
        directions: string;
        id: string;
        itemId: string;
        priority: number;
      }>;
      itemStoreProperties?: {
        __typename: 'ItemStorePropertiesNode';
        defaultSellPricePerPack: number;
        ignoreForOrders: boolean;
      } | null;
    }>;
  };
};

export type ItemsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.ItemSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.ItemFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;

export type ItemsQuery = {
  __typename: 'Queries';
  items: {
    __typename: 'ItemConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'ItemNode';
      id: string;
      code: string;
      name: string;
      unitName?: string | null;
      isVaccine: boolean;
      doses: number;
      restrictedLocationTypeId?: string | null;
    }>;
  };
};

export type ItemStockOnHandQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  key: Types.ItemSortFieldInput;
  isDesc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.ItemFilterInput>;
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
}>;

export type ItemStockOnHandQuery = {
  __typename: 'Queries';
  items: {
    __typename: 'ItemConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'ItemNode';
      availableStockOnHand: number;
      defaultPackSize: number;
      id: string;
      code: string;
      name: string;
      unitName?: string | null;
      isVaccine: boolean;
      doses: number;
      restrictedLocationTypeId?: string | null;
      itemStoreProperties?: {
        __typename: 'ItemStorePropertiesNode';
        defaultSellPricePerPack: number;
        ignoreForOrders: boolean;
      } | null;
      stats: { __typename: 'ItemStatsNode'; stockOnHand: number };
    }>;
  };
};

export type ItemsWithStatsFragment = {
  __typename: 'ItemNode';
  code: string;
  id: string;
  name: string;
  unitName?: string | null;
  defaultPackSize: number;
  isVaccine: boolean;
  doses: number;
  availableStockOnHand: number;
  stats: {
    __typename: 'ItemStatsNode';
    averageMonthlyConsumption: number;
    availableStockOnHand: number;
    availableMonthsOfStockOnHand?: number | null;
    monthsOfStockOnHand?: number | null;
    totalConsumption: number;
    stockOnHand: number;
  };
};

export type ItemsWithStatsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  key: Types.ItemSortFieldInput;
  isDesc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.ItemFilterInput>;
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
}>;

export type ItemsWithStatsQuery = {
  __typename: 'Queries';
  items: {
    __typename: 'ItemConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'ItemNode';
      code: string;
      id: string;
      name: string;
      unitName?: string | null;
      defaultPackSize: number;
      isVaccine: boolean;
      doses: number;
      availableStockOnHand: number;
      stats: {
        __typename: 'ItemStatsNode';
        averageMonthlyConsumption: number;
        availableStockOnHand: number;
        availableMonthsOfStockOnHand?: number | null;
        monthsOfStockOnHand?: number | null;
        totalConsumption: number;
        stockOnHand: number;
      };
    }>;
  };
};

export type ItemByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  itemId: Types.Scalars['String']['input'];
}>;

export type ItemByIdQuery = {
  __typename: 'Queries';
  items: {
    __typename: 'ItemConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'ItemNode';
      id: string;
      code: string;
      name: string;
      atcCategory: string;
      ddd: string;
      defaultPackSize: number;
      doses: number;
      isVaccine: boolean;
      margin: number;
      msupplyUniversalCode: string;
      msupplyUniversalName: string;
      outerPackSize: number;
      strength?: string | null;
      type: Types.ItemNodeType;
      unitName?: string | null;
      volumePerOuterPack: number;
      volumePerPack: number;
      weight: number;
      restrictedLocationTypeId?: string | null;
      availableStockOnHand: number;
      stats: {
        __typename: 'ItemStatsNode';
        averageMonthlyConsumption: number;
        availableStockOnHand: number;
        availableMonthsOfStockOnHand?: number | null;
        monthsOfStockOnHand?: number | null;
        totalConsumption: number;
        stockOnHand: number;
      };
      availableBatches: {
        __typename: 'StockLineConnector';
        totalCount: number;
        nodes: Array<{
          __typename: 'StockLineNode';
          availableNumberOfPacks: number;
          batch?: string | null;
          expiryDate?: string | null;
          id: string;
          itemId: string;
          note?: string | null;
          onHold: boolean;
          packSize: number;
          sellPricePerPack: number;
          costPricePerPack: number;
          storeId: string;
          totalNumberOfPacks: number;
          itemVariantId?: string | null;
          volumePerPack: number;
          location?: {
            __typename: 'LocationNode';
            code: string;
            id: string;
            name: string;
            onHold: boolean;
            locationType?: {
              __typename: 'LocationTypeNode';
              id: string;
              name: string;
            } | null;
          } | null;
          item: {
            __typename: 'ItemNode';
            name: string;
            code: string;
            unitName?: string | null;
            defaultPackSize: number;
            doses: number;
            isVaccine: boolean;
            restrictedLocationTypeId?: string | null;
            itemDirections: Array<{
              __typename: 'ItemDirectionNode';
              directions: string;
              id: string;
              itemId: string;
              priority: number;
            }>;
            warnings: Array<{
              __typename: 'WarningNode';
              warningText: string;
              id: string;
              itemId: string;
              priority: boolean;
              code: string;
            }>;
          };
          donor?: { __typename: 'NameNode'; id: string } | null;
          vvmStatus?: {
            __typename: 'VvmstatusNode';
            id: string;
            priority: number;
            unusable: boolean;
            description: string;
          } | null;
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
        }>;
      };
      restrictedLocationType?: {
        __typename: 'LocationTypeNode';
        id: string;
        name: string;
        minTemperature: number;
        maxTemperature: number;
      } | null;
      variants: Array<{
        __typename: 'ItemVariantNode';
        id: string;
        name: string;
        itemId: string;
        manufacturerId?: string | null;
        locationTypeId?: string | null;
        vvmType?: string | null;
        item?: {
          __typename: 'ItemNode';
          id: string;
          name: string;
          isVaccine: boolean;
          restrictedLocationTypeId?: string | null;
        } | null;
        manufacturer?: {
          __typename: 'NameNode';
          code: string;
          id: string;
          isCustomer: boolean;
          isSupplier: boolean;
          isOnHold: boolean;
          name: string;
          store?: { __typename: 'StoreNode'; id: string; code: string } | null;
        } | null;
        locationType?: {
          __typename: 'LocationTypeNode';
          id: string;
          name: string;
          minTemperature: number;
          maxTemperature: number;
        } | null;
        packagingVariants: Array<{
          __typename: 'PackagingVariantNode';
          id: string;
          name: string;
          packagingLevel: number;
          packSize?: number | null;
          volumePerUnit?: number | null;
        }>;
        bundledItemVariants: Array<{
          __typename: 'BundledItemNode';
          id: string;
          ratio: number;
          principalItemVariant?: {
            __typename: 'ItemVariantNode';
            id: string;
            name: string;
            itemId: string;
            itemName: string;
          } | null;
          bundledItemVariant?: {
            __typename: 'ItemVariantNode';
            id: string;
            name: string;
            itemId: string;
            itemName: string;
          } | null;
        }>;
        bundlesWith: Array<{
          __typename: 'BundledItemNode';
          id: string;
          ratio: number;
          principalItemVariant?: {
            __typename: 'ItemVariantNode';
            id: string;
            name: string;
            itemId: string;
            itemName: string;
          } | null;
          bundledItemVariant?: {
            __typename: 'ItemVariantNode';
            id: string;
            name: string;
            itemId: string;
            itemName: string;
          } | null;
        }>;
      }>;
      itemDirections: Array<{
        __typename: 'ItemDirectionNode';
        directions: string;
        id: string;
        itemId: string;
        priority: number;
      }>;
      itemStoreProperties?: {
        __typename: 'ItemStorePropertiesNode';
        defaultSellPricePerPack: number;
        ignoreForOrders: boolean;
      } | null;
    }>;
  };
};

export type ItemVariantsConfiguredQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;

export type ItemVariantsConfiguredQuery = {
  __typename: 'Queries';
  itemVariantsConfigured: boolean;
};

export type ItemVariantsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  itemId: Types.Scalars['String']['input'];
}>;

export type ItemVariantsQuery = {
  __typename: 'Queries';
  items: {
    __typename: 'ItemConnector';
    nodes: Array<{
      __typename: 'ItemNode';
      isVaccine: boolean;
      restrictedLocationTypeId?: string | null;
      variants: Array<{
        __typename: 'ItemVariantNode';
        id: string;
        name: string;
        itemId: string;
        manufacturerId?: string | null;
        locationTypeId?: string | null;
        vvmType?: string | null;
        item?: {
          __typename: 'ItemNode';
          id: string;
          name: string;
          isVaccine: boolean;
          restrictedLocationTypeId?: string | null;
        } | null;
        manufacturer?: {
          __typename: 'NameNode';
          code: string;
          id: string;
          isCustomer: boolean;
          isSupplier: boolean;
          isOnHold: boolean;
          name: string;
          store?: { __typename: 'StoreNode'; id: string; code: string } | null;
        } | null;
        locationType?: {
          __typename: 'LocationTypeNode';
          id: string;
          name: string;
          minTemperature: number;
          maxTemperature: number;
        } | null;
        packagingVariants: Array<{
          __typename: 'PackagingVariantNode';
          id: string;
          name: string;
          packagingLevel: number;
          packSize?: number | null;
          volumePerUnit?: number | null;
        }>;
        bundledItemVariants: Array<{
          __typename: 'BundledItemNode';
          id: string;
          ratio: number;
          principalItemVariant?: {
            __typename: 'ItemVariantNode';
            id: string;
            name: string;
            itemId: string;
            itemName: string;
          } | null;
          bundledItemVariant?: {
            __typename: 'ItemVariantNode';
            id: string;
            name: string;
            itemId: string;
            itemName: string;
          } | null;
        }>;
        bundlesWith: Array<{
          __typename: 'BundledItemNode';
          id: string;
          ratio: number;
          principalItemVariant?: {
            __typename: 'ItemVariantNode';
            id: string;
            name: string;
            itemId: string;
            itemName: string;
          } | null;
          bundledItemVariant?: {
            __typename: 'ItemVariantNode';
            id: string;
            name: string;
            itemId: string;
            itemName: string;
          } | null;
        }>;
      }>;
    }>;
  };
};

export type GetHistoricalStockLinesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  itemId: Types.Scalars['String']['input'];
  datetime?: Types.InputMaybe<Types.Scalars['DateTime']['input']>;
}>;

export type GetHistoricalStockLinesQuery = {
  __typename: 'Queries';
  historicalStockLines: {
    __typename: 'StockLineConnector';
    nodes: Array<{
      __typename: 'StockLineNode';
      availableNumberOfPacks: number;
      batch?: string | null;
      expiryDate?: string | null;
      id: string;
      itemId: string;
      note?: string | null;
      onHold: boolean;
      packSize: number;
      sellPricePerPack: number;
      costPricePerPack: number;
      storeId: string;
      totalNumberOfPacks: number;
      itemVariantId?: string | null;
      volumePerPack: number;
      location?: {
        __typename: 'LocationNode';
        code: string;
        id: string;
        name: string;
        onHold: boolean;
        locationType?: {
          __typename: 'LocationTypeNode';
          id: string;
          name: string;
        } | null;
      } | null;
      item: {
        __typename: 'ItemNode';
        name: string;
        code: string;
        unitName?: string | null;
        defaultPackSize: number;
        doses: number;
        isVaccine: boolean;
        restrictedLocationTypeId?: string | null;
        itemDirections: Array<{
          __typename: 'ItemDirectionNode';
          directions: string;
          id: string;
          itemId: string;
          priority: number;
        }>;
        warnings: Array<{
          __typename: 'WarningNode';
          warningText: string;
          id: string;
          itemId: string;
          priority: boolean;
          code: string;
        }>;
      };
      donor?: { __typename: 'NameNode'; id: string } | null;
      vvmStatus?: {
        __typename: 'VvmstatusNode';
        id: string;
        priority: number;
        unusable: boolean;
        description: string;
      } | null;
      program?: { __typename: 'ProgramNode'; id: string; name: string } | null;
      campaign?: {
        __typename: 'CampaignNode';
        id: string;
        name: string;
      } | null;
    }>;
  };
};

export type UpsertItemVariantMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpsertItemVariantInput;
}>;

export type UpsertItemVariantMutation = {
  __typename: 'Mutations';
  centralServer: {
    __typename: 'CentralServerMutationNode';
    itemVariant: {
      __typename: 'ItemVariantMutations';
      upsertItemVariant:
        | {
            __typename: 'ItemVariantNode';
            id: string;
            name: string;
            itemId: string;
            manufacturerId?: string | null;
            locationTypeId?: string | null;
            vvmType?: string | null;
            item?: {
              __typename: 'ItemNode';
              id: string;
              name: string;
              isVaccine: boolean;
              restrictedLocationTypeId?: string | null;
            } | null;
            manufacturer?: {
              __typename: 'NameNode';
              code: string;
              id: string;
              isCustomer: boolean;
              isSupplier: boolean;
              isOnHold: boolean;
              name: string;
              store?: {
                __typename: 'StoreNode';
                id: string;
                code: string;
              } | null;
            } | null;
            locationType?: {
              __typename: 'LocationTypeNode';
              id: string;
              name: string;
              minTemperature: number;
              maxTemperature: number;
            } | null;
            packagingVariants: Array<{
              __typename: 'PackagingVariantNode';
              id: string;
              name: string;
              packagingLevel: number;
              packSize?: number | null;
              volumePerUnit?: number | null;
            }>;
            bundledItemVariants: Array<{
              __typename: 'BundledItemNode';
              id: string;
              ratio: number;
              principalItemVariant?: {
                __typename: 'ItemVariantNode';
                id: string;
                name: string;
                itemId: string;
                itemName: string;
              } | null;
              bundledItemVariant?: {
                __typename: 'ItemVariantNode';
                id: string;
                name: string;
                itemId: string;
                itemName: string;
              } | null;
            }>;
            bundlesWith: Array<{
              __typename: 'BundledItemNode';
              id: string;
              ratio: number;
              principalItemVariant?: {
                __typename: 'ItemVariantNode';
                id: string;
                name: string;
                itemId: string;
                itemName: string;
              } | null;
              bundledItemVariant?: {
                __typename: 'ItemVariantNode';
                id: string;
                name: string;
                itemId: string;
                itemName: string;
              } | null;
            }>;
          }
        | {
            __typename: 'UpsertItemVariantError';
            error:
              | { __typename: 'DatabaseError'; description: string }
              | { __typename: 'InternalError'; description: string }
              | {
                  __typename: 'UniqueValueViolation';
                  description: string;
                  field: Types.UniqueValueKey;
                };
          };
    };
  };
};

export type DeleteItemVariantMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.DeleteItemVariantInput;
}>;

export type DeleteItemVariantMutation = {
  __typename: 'Mutations';
  centralServer: {
    __typename: 'CentralServerMutationNode';
    itemVariant: {
      __typename: 'ItemVariantMutations';
      deleteItemVariant: { __typename: 'DeleteResponse'; id: string };
    };
  };
};

export type LocationTypesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;

export type LocationTypesQuery = {
  __typename: 'Queries';
  locationTypes: {
    __typename: 'LocationTypeConnector';
    nodes: Array<{
      __typename: 'LocationTypeNode';
      id: string;
      name: string;
      minTemperature: number;
      maxTemperature: number;
    }>;
  };
};

export type UpsertBundledItemMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpsertBundledItemInput;
}>;

export type UpsertBundledItemMutation = {
  __typename: 'Mutations';
  centralServer: {
    __typename: 'CentralServerMutationNode';
    bundledItem: {
      __typename: 'BundledItemMutations';
      upsertBundledItem:
        | {
            __typename: 'BundledItemNode';
            id: string;
            ratio: number;
            principalItemVariant?: {
              __typename: 'ItemVariantNode';
              id: string;
              name: string;
              itemId: string;
              itemName: string;
            } | null;
            bundledItemVariant?: {
              __typename: 'ItemVariantNode';
              id: string;
              name: string;
              itemId: string;
              itemName: string;
            } | null;
          }
        | { __typename: 'UpsertBundledItemError' };
    };
  };
};

export type DeleteBundledItemMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.DeleteBundledItemInput;
}>;

export type DeleteBundledItemMutation = {
  __typename: 'Mutations';
  centralServer: {
    __typename: 'CentralServerMutationNode';
    bundledItem: {
      __typename: 'BundledItemMutations';
      deleteBundledItem: { __typename: 'DeleteResponse'; id: string };
    };
  };
};

export type ItemLedgerFragment = {
  __typename: 'ItemLedgerNode';
  id: string;
  balance: number;
  batch?: string | null;
  costPricePerPack: number;
  datetime: string;
  expiryDate?: string | null;
  invoiceNumber: number;
  invoiceId: string;
  invoiceStatus: Types.InvoiceNodeStatus;
  invoiceType: Types.InvoiceNodeType;
  name: string;
  packSize: number;
  movementInUnits: number;
  reason?: string | null;
  sellPricePerPack: number;
  totalBeforeTax?: number | null;
  numberOfPacks: number;
};

export type ItemLedgerQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  filter?: Types.InputMaybe<Types.ItemLedgerFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;

export type ItemLedgerQuery = {
  __typename: 'Queries';
  itemLedger: {
    __typename: 'ItemLedgerConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'ItemLedgerNode';
      id: string;
      balance: number;
      batch?: string | null;
      costPricePerPack: number;
      datetime: string;
      expiryDate?: string | null;
      invoiceNumber: number;
      invoiceId: string;
      invoiceStatus: Types.InvoiceNodeStatus;
      invoiceType: Types.InvoiceNodeType;
      name: string;
      packSize: number;
      movementInUnits: number;
      reason?: string | null;
      sellPricePerPack: number;
      totalBeforeTax?: number | null;
      numberOfPacks: number;
    }>;
  };
};

export const ItemRowFragmentDoc = gql`
  fragment ItemRow on ItemNode {
    __typename
    id
    code
    name
    unitName
    isVaccine
    doses
    restrictedLocationTypeId
  }
`;
export const WarningFragmentDoc = gql`
  fragment Warning on WarningNode {
    __typename
    warningText
    id
    itemId
    priority
    code
  }
`;
export const ItemRowWithWarningsFragmentDoc = gql`
  fragment ItemRowWithWarnings on ItemNode {
    ...ItemRow
    warnings {
      ...Warning
    }
  }
  ${ItemRowFragmentDoc}
  ${WarningFragmentDoc}
`;
export const ItemWithPackSizeFragmentDoc = gql`
  fragment ItemWithPackSize on ItemNode {
    ...ItemRow
    defaultPackSize
  }
  ${ItemRowFragmentDoc}
`;
export const ItemStockOnHandFragmentDoc = gql`
  fragment ItemStockOnHand on ItemNode {
    ...ItemWithPackSize
    availableStockOnHand(storeId: $storeId)
    itemStoreProperties(storeId: $storeId) {
      defaultSellPricePerPack
      ignoreForOrders
    }
    stats(storeId: $storeId) {
      stockOnHand
    }
  }
  ${ItemWithPackSizeFragmentDoc}
`;
export const ItemRowWithStatsFragmentDoc = gql`
  fragment ItemRowWithStats on ItemNode {
    ...ItemStockOnHand
    stats(storeId: $storeId) {
      __typename
      averageMonthlyConsumption
      availableStockOnHand
      availableMonthsOfStockOnHand
      monthsOfStockOnHand
      totalConsumption
      stockOnHand
    }
  }
  ${ItemStockOnHandFragmentDoc}
`;
export const LocationTypeFragmentDoc = gql`
  fragment LocationType on LocationTypeNode {
    __typename
    id
    name
    minTemperature
    maxTemperature
  }
`;
export const ItemDirectionFragmentDoc = gql`
  fragment ItemDirection on ItemDirectionNode {
    __typename
    directions
    id
    itemId
    priority
  }
`;
export const StockLineFragmentDoc = gql`
  fragment StockLine on StockLineNode {
    availableNumberOfPacks
    batch
    expiryDate
    id
    itemId
    location {
      code
      id
      name
      onHold
      locationType {
        id
        name
      }
    }
    item {
      name
      code
      unitName
      defaultPackSize
      doses
      isVaccine
      restrictedLocationTypeId
      itemDirections {
        ...ItemDirection
      }
      warnings {
        ...Warning
      }
    }
    note
    onHold
    packSize
    sellPricePerPack
    costPricePerPack
    storeId
    totalNumberOfPacks
    itemVariantId
    volumePerPack
    donor(storeId: $storeId) {
      id
    }
    vvmStatus {
      __typename
      id
      priority
      unusable
      description
    }
    program {
      id
      name
    }
    campaign {
      id
      name
    }
  }
  ${ItemDirectionFragmentDoc}
  ${WarningFragmentDoc}
`;
export const PackagingVariantFragmentDoc = gql`
  fragment PackagingVariant on PackagingVariantNode {
    __typename
    id
    name
    packagingLevel
    packSize
    volumePerUnit
  }
`;
export const BundledItemVariantFragmentDoc = gql`
  fragment BundledItemVariant on ItemVariantNode {
    id
    name
    itemId
    itemName
  }
`;
export const BundledItemFragmentDoc = gql`
  fragment BundledItem on BundledItemNode {
    __typename
    id
    ratio
    principalItemVariant {
      ...BundledItemVariant
    }
    bundledItemVariant {
      ...BundledItemVariant
    }
  }
  ${BundledItemVariantFragmentDoc}
`;
export const ItemVariantFragmentDoc = gql`
  fragment ItemVariant on ItemVariantNode {
    __typename
    id
    name
    itemId
    item {
      id
      name
      isVaccine
      restrictedLocationTypeId
    }
    manufacturerId
    manufacturer(storeId: $storeId) {
      ...NameRow
    }
    locationTypeId
    locationType {
      ...LocationType
    }
    packagingVariants {
      ...PackagingVariant
    }
    bundledItemVariants {
      ...BundledItem
    }
    bundlesWith {
      ...BundledItem
    }
    vvmType
  }
  ${NameRowFragmentDoc}
  ${LocationTypeFragmentDoc}
  ${PackagingVariantFragmentDoc}
  ${BundledItemFragmentDoc}
`;
export const ItemFragmentDoc = gql`
  fragment Item on ItemNode {
    __typename
    id
    code
    name
    atcCategory
    ddd
    defaultPackSize
    doses
    isVaccine
    margin
    msupplyUniversalCode
    msupplyUniversalName
    outerPackSize
    strength
    type
    unitName
    volumePerOuterPack
    volumePerPack
    weight
    restrictedLocationTypeId
    restrictedLocationType {
      ...LocationType
    }
    availableStockOnHand(storeId: $storeId)
    availableBatches(storeId: $storeId) {
      __typename
      totalCount
      nodes {
        __typename
        ...StockLine
      }
    }
    stats(storeId: $storeId) {
      __typename
      averageMonthlyConsumption
      availableStockOnHand
      availableMonthsOfStockOnHand
      monthsOfStockOnHand
      totalConsumption
      stockOnHand
    }
    variants {
      ...ItemVariant
    }
    itemDirections {
      ...ItemDirection
    }
    itemStoreProperties(storeId: $storeId) {
      defaultSellPricePerPack
      ignoreForOrders
    }
  }
  ${LocationTypeFragmentDoc}
  ${StockLineFragmentDoc}
  ${ItemVariantFragmentDoc}
  ${ItemDirectionFragmentDoc}
`;
export const ItemsWithStatsFragmentDoc = gql`
  fragment ItemsWithStats on ItemNode {
    __typename
    code
    id
    name
    unitName
    defaultPackSize
    isVaccine
    doses
    availableStockOnHand(storeId: $storeId)
    stats(storeId: $storeId) {
      __typename
      averageMonthlyConsumption
      availableStockOnHand
      availableMonthsOfStockOnHand
      monthsOfStockOnHand
      totalConsumption
      stockOnHand
    }
  }
`;
export const ItemLedgerFragmentDoc = gql`
  fragment ItemLedger on ItemLedgerNode {
    id
    balance
    batch
    costPricePerPack
    datetime
    expiryDate
    invoiceNumber
    invoiceId
    invoiceStatus
    invoiceType
    name
    packSize
    movementInUnits
    reason
    sellPricePerPack
    totalBeforeTax
    numberOfPacks
  }
`;
export const ItemsWithStockLinesDocument = gql`
  query itemsWithStockLines(
    $first: Int
    $offset: Int
    $key: ItemSortFieldInput!
    $desc: Boolean
    $filter: ItemFilterInput
    $storeId: String!
  ) {
    items(
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
      filter: $filter
      storeId: $storeId
    ) {
      ... on ItemConnector {
        __typename
        nodes {
          ...Item
        }
        totalCount
      }
    }
  }
  ${ItemFragmentDoc}
`;
export const ItemsDocument = gql`
  query items(
    $first: Int
    $offset: Int
    $key: ItemSortFieldInput!
    $desc: Boolean
    $filter: ItemFilterInput
    $storeId: String!
  ) {
    items(
      storeId: $storeId
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
      filter: $filter
    ) {
      ... on ItemConnector {
        __typename
        nodes {
          ...ItemRow
        }
        totalCount
      }
    }
  }
  ${ItemRowFragmentDoc}
`;
export const ItemStockOnHandDocument = gql`
  query itemStockOnHand(
    $storeId: String!
    $key: ItemSortFieldInput!
    $isDesc: Boolean
    $filter: ItemFilterInput
    $first: Int
    $offset: Int
  ) {
    items(
      storeId: $storeId
      sort: { key: $key, desc: $isDesc }
      filter: $filter
      page: { first: $first, offset: $offset }
    ) {
      ... on ItemConnector {
        __typename
        nodes {
          ...ItemStockOnHand
        }
        totalCount
      }
    }
  }
  ${ItemStockOnHandFragmentDoc}
`;
export const ItemsWithStatsDocument = gql`
  query itemsWithStats(
    $storeId: String!
    $key: ItemSortFieldInput!
    $isDesc: Boolean
    $filter: ItemFilterInput
    $first: Int
    $offset: Int
  ) {
    items(
      storeId: $storeId
      sort: { key: $key, desc: $isDesc }
      filter: $filter
      page: { first: $first, offset: $offset }
    ) {
      ... on ItemConnector {
        __typename
        nodes {
          ...ItemsWithStats
        }
        totalCount
      }
    }
  }
  ${ItemsWithStatsFragmentDoc}
`;
export const ItemByIdDocument = gql`
  query itemById($storeId: String!, $itemId: String!) {
    items(
      storeId: $storeId
      filter: { id: { equalTo: $itemId }, isActive: true }
    ) {
      ... on ItemConnector {
        __typename
        nodes {
          __typename
          ...Item
          stats(storeId: $storeId) {
            __typename
            averageMonthlyConsumption
            availableStockOnHand
            availableMonthsOfStockOnHand
          }
          availableBatches(storeId: $storeId) {
            totalCount
            nodes {
              ...StockLine
            }
          }
        }
        totalCount
      }
    }
  }
  ${ItemFragmentDoc}
  ${StockLineFragmentDoc}
`;
export const ItemVariantsConfiguredDocument = gql`
  query itemVariantsConfigured($storeId: String!) {
    itemVariantsConfigured(storeId: $storeId)
  }
`;
export const ItemVariantsDocument = gql`
  query itemVariants($storeId: String!, $itemId: String!) {
    items(
      storeId: $storeId
      filter: { id: { equalTo: $itemId }, isActive: true }
    ) {
      ... on ItemConnector {
        __typename
        nodes {
          __typename
          isVaccine
          restrictedLocationTypeId
          variants {
            ...ItemVariant
          }
        }
      }
    }
  }
  ${ItemVariantFragmentDoc}
`;
export const GetHistoricalStockLinesDocument = gql`
  query getHistoricalStockLines(
    $storeId: String!
    $itemId: String!
    $datetime: DateTime
  ) {
    historicalStockLines(
      storeId: $storeId
      itemId: $itemId
      datetime: $datetime
    ) {
      ... on StockLineConnector {
        nodes {
          ...StockLine
        }
      }
    }
  }
  ${StockLineFragmentDoc}
`;
export const UpsertItemVariantDocument = gql`
  mutation upsertItemVariant(
    $storeId: String!
    $input: UpsertItemVariantInput!
  ) {
    centralServer {
      itemVariant {
        upsertItemVariant(storeId: $storeId, input: $input) {
          __typename
          ... on ItemVariantNode {
            ...ItemVariant
          }
          ... on UpsertItemVariantError {
            __typename
            error {
              __typename
              description
              ... on UniqueValueViolation {
                description
                field
              }
            }
          }
        }
      }
    }
  }
  ${ItemVariantFragmentDoc}
`;
export const DeleteItemVariantDocument = gql`
  mutation deleteItemVariant(
    $storeId: String!
    $input: DeleteItemVariantInput!
  ) {
    centralServer {
      itemVariant {
        deleteItemVariant(storeId: $storeId, input: $input) {
          __typename
          ... on DeleteResponse {
            __typename
            id
          }
        }
      }
    }
  }
`;
export const LocationTypesDocument = gql`
  query locationTypes($storeId: String!) {
    locationTypes(
      storeId: $storeId
      sort: { key: minTemperature, desc: true }
    ) {
      ... on LocationTypeConnector {
        nodes {
          ...LocationType
        }
      }
    }
  }
  ${LocationTypeFragmentDoc}
`;
export const UpsertBundledItemDocument = gql`
  mutation upsertBundledItem(
    $storeId: String!
    $input: UpsertBundledItemInput!
  ) {
    centralServer {
      bundledItem {
        upsertBundledItem(storeId: $storeId, input: $input) {
          __typename
          ... on BundledItemNode {
            ...BundledItem
          }
        }
      }
    }
  }
  ${BundledItemFragmentDoc}
`;
export const DeleteBundledItemDocument = gql`
  mutation deleteBundledItem(
    $storeId: String!
    $input: DeleteBundledItemInput!
  ) {
    centralServer {
      bundledItem {
        deleteBundledItem(storeId: $storeId, input: $input) {
          __typename
          ... on DeleteResponse {
            __typename
            id
          }
        }
      }
    }
  }
`;
export const ItemLedgerDocument = gql`
  query itemLedger(
    $first: Int
    $offset: Int
    $filter: ItemLedgerFilterInput
    $storeId: String!
  ) {
    itemLedger(
      storeId: $storeId
      filter: $filter
      page: { first: $first, offset: $offset }
    ) {
      ... on ItemLedgerConnector {
        __typename
        nodes {
          __typename
          ...ItemLedger
        }
        totalCount
      }
    }
  }
  ${ItemLedgerFragmentDoc}
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
    itemsWithStockLines(
      variables: ItemsWithStockLinesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<ItemsWithStockLinesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ItemsWithStockLinesQuery>({
            document: ItemsWithStockLinesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'itemsWithStockLines',
        'query',
        variables
      );
    },
    items(
      variables: ItemsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<ItemsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ItemsQuery>({
            document: ItemsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'items',
        'query',
        variables
      );
    },
    itemStockOnHand(
      variables: ItemStockOnHandQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<ItemStockOnHandQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ItemStockOnHandQuery>({
            document: ItemStockOnHandDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'itemStockOnHand',
        'query',
        variables
      );
    },
    itemsWithStats(
      variables: ItemsWithStatsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<ItemsWithStatsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ItemsWithStatsQuery>({
            document: ItemsWithStatsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'itemsWithStats',
        'query',
        variables
      );
    },
    itemById(
      variables: ItemByIdQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<ItemByIdQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ItemByIdQuery>({
            document: ItemByIdDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'itemById',
        'query',
        variables
      );
    },
    itemVariantsConfigured(
      variables: ItemVariantsConfiguredQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<ItemVariantsConfiguredQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ItemVariantsConfiguredQuery>({
            document: ItemVariantsConfiguredDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'itemVariantsConfigured',
        'query',
        variables
      );
    },
    itemVariants(
      variables: ItemVariantsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<ItemVariantsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ItemVariantsQuery>({
            document: ItemVariantsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'itemVariants',
        'query',
        variables
      );
    },
    getHistoricalStockLines(
      variables: GetHistoricalStockLinesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<GetHistoricalStockLinesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<GetHistoricalStockLinesQuery>({
            document: GetHistoricalStockLinesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'getHistoricalStockLines',
        'query',
        variables
      );
    },
    upsertItemVariant(
      variables: UpsertItemVariantMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<UpsertItemVariantMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpsertItemVariantMutation>({
            document: UpsertItemVariantDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'upsertItemVariant',
        'mutation',
        variables
      );
    },
    deleteItemVariant(
      variables: DeleteItemVariantMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<DeleteItemVariantMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteItemVariantMutation>({
            document: DeleteItemVariantDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'deleteItemVariant',
        'mutation',
        variables
      );
    },
    locationTypes(
      variables: LocationTypesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<LocationTypesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<LocationTypesQuery>({
            document: LocationTypesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'locationTypes',
        'query',
        variables
      );
    },
    upsertBundledItem(
      variables: UpsertBundledItemMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<UpsertBundledItemMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpsertBundledItemMutation>({
            document: UpsertBundledItemDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'upsertBundledItem',
        'mutation',
        variables
      );
    },
    deleteBundledItem(
      variables: DeleteBundledItemMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<DeleteBundledItemMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteBundledItemMutation>({
            document: DeleteBundledItemDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'deleteBundledItem',
        'mutation',
        variables
      );
    },
    itemLedger(
      variables: ItemLedgerQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<ItemLedgerQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ItemLedgerQuery>({
            document: ItemLedgerDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'itemLedger',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
