export interface ItemRow {
  id: string;
  code: string;
  name: string;
  unitName?: string | null;
}

export type ItemLike = ItemLikeLine | ItemLikeAggregate;

export interface ItemLikeLine {
  item: ItemRow;
}

export interface ItemLikeAggregate {
  itemId: string;
  lines: [ItemLikeLine, ...ItemLikeLine[]];
}
