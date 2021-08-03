const ItemData = Array.from({ length: 10 }).map((_, i) => ({
  id: `${i}`,
  code: `Code: ${i}`,
  name: `Name: ${i}`,
}));

const ItemType = `
type Item {
    id: String
    name: String
    code: String
}
`;

const ItemResolvers = {
  items: () => ItemData,
};

const ItemQueries = `
    items: [Item]
`;

export { ItemData, ItemType, ItemResolvers, ItemQueries };
