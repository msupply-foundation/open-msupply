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
}

export interface ItemLikeAggregate {
  itemId: string;
  lines: [ItemLikeLine, ...ItemLikeLine[]];
}
