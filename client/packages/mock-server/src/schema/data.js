import faker from 'faker';

export const ItemData = [];

const choose = options => {
  const numberOfOptions = options.length;

  const randomIdx = Math.floor(Math.random() * numberOfOptions);

  return options[randomIdx];
};

export const TransactionData = Array.from({ length: 500 }).map((_, i) => ({
  id: `${i}`,
  name: `${faker.name.firstName()} ${faker.name.lastName()}`,
  status: choose(['Confirmed', 'Finalised']),
  entered: faker.date.past().toString(),
  confirmed: faker.date.past().toString(),
  invoiceNumber: `${i}`,
  total: `$${faker.commerce.price()}`,
  color: 'grey',
  type: choose([
    'Customer invoice',
    'Supplier invoice',
    'Customer credit',
    'Supplier credit',
  ]),
  comment: faker.commerce.productDescription(),

  items: Array.from({ length: Math.ceil(Math.random() * 10) }).map((_, j) => {
    const item = {
      id: `${i}-${j}`,
      code: `${faker.random.alpha({ count: 6 })}`,
      name: `${faker.commerce.productName()}`,
      packSize: 1,
      quantity: faker.datatype.number(100),
      transactionId: `${i}`,
    };

    ItemData.push(item);

    return item;
  }),
}));
