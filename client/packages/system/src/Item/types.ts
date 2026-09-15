import { ItemRowFragment, ItemStockOnHandFragment } from './api';

export type ItemLike = ItemLikeLine | ItemLikeAggregate;

export interface ItemLikeLine {
  item: ItemRowFragment;
}

export interface ItemLikeAggregate {
  itemId: string;
  lines: ItemLikeLine[];
}

export type ItemOptionType = Pick<
  ItemStockOnHandFragment,
  'id' | 'code' | 'name' | 'availableStockOnHand'
>;
