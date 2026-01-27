import { EqualFilter } from '@common/generated/EqualFilter';

import { NameFilterInput, ItemFilterInput } from '../generated-types/graphql';

export type LikeFilter<T> = {
  equalTo?: T;
};

type EqualToAndOrLike = Pick<EqualFilter<string>, 'equal_to'> &
  LikeFilter<string>;

export type NamesFilter = {
  address1?: EqualToAndOrLike;
  address2?: EqualToAndOrLike;
  code?: EqualToAndOrLike;
  codeOrName?: EqualToAndOrLike;
  country?: EqualToAndOrLike;
  email?: EqualToAndOrLike;
  id?: Pick<
    EqualFilter<string>,
    | 'equal_any'
    | 'equal_any_or_null'
    | 'equal_to'
    | 'not_equal_all'
    | 'not_equal_to'
  >;
  isCustomer?: boolean;
  isDonor?: boolean;
  isManufacturer?: boolean;
  isStore?: boolean;
  isSupplier?: boolean;
  isSystemName?: boolean;
  isVisible?: boolean;
  name?: EqualToAndOrLike;
  phone?: EqualToAndOrLike;
  storecode?: EqualToAndOrLike;
  supplyingStoreId?: Pick<
    EqualFilter<string>,
    | 'equal_any'
    | 'equal_any_or_null'
    | 'equal_to'
    | 'not_equal_all'
    | 'not_equal_to'
  >;
  type?: Pick<
    EqualFilter<string>,
    'equal_any' | 'equal_to' | 'not_equal_all' | 'not_equal_to'
  >;
};

export type ItemsFilter = {
  categoryId?: string;
  categoryName?: string;
  code?: EqualToAndOrLike;
  codOrName?: EqualToAndOrLike;
  hasStockOnHand?: boolean;
  id?: Pick<
    EqualFilter<string>,
    | 'equal_any'
    | 'equal_any_or_null'
    | 'equal_to'
    | 'not_equal_all'
    | 'not_equal_to'
  >;
  ignoreForOrders?: boolean;
  isActive?: boolean;
  isProgramItem?: boolean;
  isVaccine?: boolean;
  isVisible?: boolean;
  isVisibleOrOnHand?: boolean;
  masterListId?: Pick<
    EqualFilter<string>,
    | 'equal_any'
    | 'equal_any_or_null'
    | 'equal_to'
    | 'not_equal_all'
    | 'not_equal_to'
  >;
  maxMonthsOfStock?: number;
  minMonthsOfStock?: number;
  productsAtRiskOfBeingOutOfStock?: boolean;
  type?: Pick<
    EqualFilter<string>,
    'equal_any' | 'equal_to' | 'not_equal_all' | 'not_equal_to'
  >;
  withRecentConsumption?: boolean;
};

export type IssueStockEndpointInput = {
  customerFilter: NameFilterInput;
  itemFilter: ItemFilterInput;
  quantity: number;
};

export type IssueStockEndpointResponse = {
  success: boolean;
  message: string;
};
