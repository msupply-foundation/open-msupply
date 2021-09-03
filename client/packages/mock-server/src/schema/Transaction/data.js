import faker from 'faker';

export const TransactionData = Array.from({ length: 1 }).map((_, i) => ({
  id: `${i}`,
  customer: `${faker.name.firstName()} ${faker.name.lastName()}`,
  supplier: `${faker.name.firstName()} ${faker.name.lastName()}`,
  date: faker.date.past().toString(),
  total: `${faker.commerce.price()}`,
}));
