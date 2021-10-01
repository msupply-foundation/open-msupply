import { TransactionData, ItemData } from './data';

const ItemType = `
type Item {
    id: String
    name: String
    code: String
    packSize: Int
    quantity: Int
    transaction: Transaction
}
`;

const ItemResolvers = {
  items: () => ItemData,
};

const ItemInput = `
    input ItemPatch {
    id: String
    name: String
    code: String
    packSize: Int
    quantity: Int
    transactionId: String
}
`;

const ItemMutationResolvers = {
  upsertItem: (_, { item: { id: itemId, ...patch } }) => {
    if (!itemId) {
      const newId = String(ItemData.length);

      const newItem = { id: newId, ...patch };

      ItemData.push(newItem);

      const idx2 = TransactionData.findIndex(
        ({ transactionId }) => id === transactionId
      );

      return { ...newItem, transaction: TransactionData[idx2] };
    }

    const idx = ItemData.findIndex(({ id }) => id === itemId);
    ItemData[idx] = { ...ItemData[idx], ...patch };
    const idx2 = TransactionData.findIndex(
      ({ transactionId }) => ItemData.transactionId === transactionId
    );

    return { ...ItemData[idx], transaction: TransactionData[idx2] };
  },
};

const ItemMutations = `
  upsertItem(item: ItemPatch): Item
`;

const ItemQueries = `
    items: [Item]
`;

export {
  ItemData,
  ItemType,
  ItemResolvers,
  ItemQueries,
  ItemMutationResolvers,
  ItemMutations,
  ItemInput,
};
