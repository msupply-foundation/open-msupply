import faker from 'faker';

const choose = options => {
  const numberOfOptions = options.length;
  const randomIdx = Math.floor(Math.random() * numberOfOptions);
  return options[randomIdx];
};

const randomPercentage = min => faker.datatype.number(100) / 100 + min;

const takeRandomNumberFrom = (min, max) => faker.datatype.number({ min, max });

const takeRandomPercentageFrom = (number, options = { minPercentage: 0 }) => {
  const percentageToTake = randomPercentage(options.minPercentage);
  const take = Math.ceil(number * percentageToTake);

  return take;
};

const takeRandomElementFrom = array => {
  const randomIdx = Math.floor(Math.random() * array.length);
  return array[randomIdx];
};

const takeRandomSubsetFrom = array => {
  const sizeOfSubset = takeRandomNumberFrom(0, array.length);
  return Array.from({ length: sizeOfSubset }).map(() =>
    takeRandomElementFrom(array)
  );
};

const createStockLines = items => {
  const stockLines = [];

  items.forEach(item => {
    const { id: itemId } = item;

    // Take a random quantity we're going to use of this items total available.
    let quantityToUse = takeRandomNumberFrom(100, 500);
    let i = 0;
    while (quantityToUse > 0) {
      // Take another random amount from the total quantity
      const quantityForThisBatch = takeRandomPercentageFrom(quantityToUse, {
        minPercentage: 10,
      });

      // Either this percentage is greater than what we have left or less. If it's greater,
      // just use the remaining stock.
      const availableNumberOfPacks =
        quantityForThisBatch > quantityToUse
          ? quantityToUse
          : quantityForThisBatch;

      // Create the stock line
      const stockLine = {
        id: `${itemId}-${i++}`,
        packSize: 1,
        expiry: faker.date.future().toString(),
        availableNumberOfPacks,
        itemId,
      };

      quantityToUse = quantityToUse - availableNumberOfPacks;

      stockLines.push(stockLine);
    }
  });

  return stockLines.flat();
};

const getSummer = key => (acc, obj) => obj[key] + acc;

const getAvailableQuantity = (stockLines = StockLineData) => {
  const quantity = stockLines.reduce(getSummer('availableNumberOfPacks'), 0);
  return quantity;
};

export const getStockLinesForItem = (item, stockLines = StockLineData) => {
  return stockLines.filter(({ itemId }) => itemId === item.id);
};

const createInvoiceLines = (items, stockLines, transactions) => {
  const invoiceLines = [];

  transactions.forEach(transaction => {
    takeRandomSubsetFrom(items).forEach(item => {
      const stockLinesToUse = takeRandomSubsetFrom(
        getStockLinesForItem(item, stockLines)
      );

      const invoiceLinesForStockLines = stockLinesToUse.map((stockLine, i) => {
        const { availableNumberOfPacks } = stockLine;

        const quantity = takeRandomPercentageFrom(availableNumberOfPacks);

        const invoiceLine = {
          id: `${transaction.id}-${item.id}-${stockLine.id}-${i}`,
          itemName: item.name,
          itemCode: item.code,
          transactionId: transaction.id,
          stockLineId: stockLine.id,
          itemId: item.id,
          quantity,
          batchName: stockLine.name,
          expiry: stockLine.expiry,
        };

        stockLine.availableNumberOfPacks =
          stockLine.availableNumberOfPacks - quantity;

        return invoiceLine;
      });

      invoiceLines.push(invoiceLinesForStockLines);
    });
  });

  return invoiceLines.flat();
};

const createItems = (numberToCreate = Math.ceil(Math.random() * 10)) => {
  return Array.from({ length: numberToCreate }).map((_, j) => {
    const itemId = `item-${j}`;

    const item = {
      id: itemId,
      code: `${faker.random.alpha({ count: 6 })}`,
      name: `${faker.commerce.productName()}`,
    };

    return item;
  });
};

const createTransactions = (numberToCreate = Math.ceil(Math.random() * 10)) => {
  return Array.from({ length: numberToCreate }).map((_, i) => {
    const transaction = {
      id: `${i}`,
      name: `${faker.name.firstName()} ${faker.name.lastName()}`,
      status: choose(['Confirmed', 'Finalised']),
      entered: faker.date.past().toString(),
      confirmed: faker.date.past().toString(),
      invoiceNumber: `${i}`,
      total: `$${faker.commerce.price()}`,
      color: 'grey',
      type: 'Customer invoice',

      comment: faker.commerce.productDescription(),
    };

    return transaction;
  });
};

export const ItemData = createItems();
export const StockLineData = createStockLines(ItemData);
export const TransactionData = createTransactions();
export const InvoiceLineData = createInvoiceLines(
  ItemData,
  StockLineData,
  TransactionData
);
