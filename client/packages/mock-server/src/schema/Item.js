import faker from 'faker';

const ItemData = Array.from({ length: 10 }).map(_ => ({
  id: `${faker.datatype.uuid()}`,
  code: `${faker.random.alpha({ count: 6 })}`,
  name: `${faker.commerce.productName()}`,
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
