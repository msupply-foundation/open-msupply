import { ItemRowFragment } from './api';

export type ItemLike = ItemLikeLine | ItemLikeAggregate;

export interface ItemLikeLine {
  item: ItemRowFragment;
}

export interface ItemLikeAggregate {
  itemId: string;
  lines: ItemLikeLine[];
}
