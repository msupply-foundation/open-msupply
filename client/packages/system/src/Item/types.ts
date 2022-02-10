import { ItemNode } from '@common/types';

export interface ItemRow {
  id: string;
  code: string;
  name: string;
}

export type ItemLike = ItemLikeLine | ItemLikeAggregate;

export interface ItemLikeLine {
  itemId: string;
  itemName: string;
  itemCode: string;
  item?: ItemNode;
}

export interface ItemLikeAggregate {
  itemId: string;
  lines: [ItemLikeLine, ...ItemLikeLine[]];
}
