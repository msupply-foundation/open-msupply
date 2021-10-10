import { StockLine, Invoice, Item, InvoiceLine } from './types';
import { getFilter } from './../utils';
import faker from 'faker';
import {
  takeRandomElementFrom,
  takeRandomNumberFrom,
  takeRandomPercentageFrom,
  takeRandomSubsetFrom,
} from '../utils';

export const getStockLinesForItem = (
  item: Item,
  stockLines: StockLine[] = StockLineData
): StockLine[] => {
  return stockLines.filter(getFilter(item.id, 'itemId'));
};

const createStockLines = (items: Item[]) => {
  const stockLines: StockLine[] = [];

  items.forEach(item => {
    const { id: itemId } = item;

    // Take a random quantity we're going to use of this items total available.
    // to distribute over all the stock lines we will create.
    let quantityToUse = takeRandomNumberFrom(100, 500);
    let i = 0;

    while (quantityToUse > 0) {
      // Take another random amount from the total quantity for this stock line. We create a random number of
      // stock lines by taking a random quantity (min of 10%) from the pool of available quantity.
      const quantityForThisBatch = takeRandomPercentageFrom(quantityToUse, {
        minPercentage: 10,
      });

      // Use the remaining available if we generated a quantity for this stock line greater than the available
      // quantity.
      const availableNumberOfPacks =
        quantityForThisBatch > quantityToUse
          ? quantityToUse
          : quantityForThisBatch;

      const stockLine = {
        id: `${itemId}-${i++}`,
        name: `${itemId}-${i++}`,
        packSize: 1,
        expiry: faker.date.future().toString(),
        availableNumberOfPacks,
        itemId,
      } as StockLine;

      quantityToUse = quantityToUse - availableNumberOfPacks;

      stockLines.push(stockLine);
    }
  });

  return stockLines;
};

const createInvoiceLines = (
  items: Item[],
  stockLines: StockLine[],
  invoices: Invoice[]
): InvoiceLine[] => {
  const invoiceLines: InvoiceLine[][] = [];

  invoices.forEach(invoice => {
    takeRandomSubsetFrom(items).forEach(item => {
      const stockLinesToUse = takeRandomSubsetFrom(
        getStockLinesForItem(item, stockLines)
      );

      const invoiceLinesForStockLines = stockLinesToUse.map(
        (stockLine: Omit<StockLine, 'item'>, i) => {
          const { availableNumberOfPacks } = stockLine;

          const quantity = takeRandomPercentageFrom(
            availableNumberOfPacks as number
          );

          const invoiceLine = {
            id: `${invoice.id}-${item.id}-${stockLine.id}-${i}`,
            itemName: item.name,
            itemCode: item.code,
            invoiceId: invoice.id,
            stockLineId: stockLine.id,
            itemId: item.id,
            quantity,
            batchName: stockLine.name,
            expiry: stockLine.expiry,
          } as InvoiceLine;

          stockLine.availableNumberOfPacks =
            (stockLine.availableNumberOfPacks as number) - quantity;

          return invoiceLine;
        }
      );

      invoiceLines.push(invoiceLinesForStockLines);
    });
  });

  return invoiceLines.flat();
};

const createItems = (
  numberToCreate = Math.ceil(Math.random() * 10) + 10
): Item[] => {
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

const createInvoices = (
  numberToCreate = Math.ceil(Math.random() * 10) + 100
): Invoice[] => {
  return Array.from({ length: numberToCreate }).map((_, i) => {
    const invoice = {
      id: `${i}`,
      name: `${faker.name.firstName()} ${faker.name.lastName()}`,
      status: takeRandomElementFrom(['Confirmed', 'Finalised']),
      entered: faker.date.past().toString(),
      confirmed: faker.date.past().toString(),
      invoiceNumber: `${i}`,
      total: `$${faker.commerce.price()}`,
      color: 'grey',
      type: 'Customer invoice',
      comment: faker.commerce.productDescription(),
    };

    return invoice;
  });
};

export const ItemData = createItems();
export const StockLineData = createStockLines(ItemData);
export const InvoiceData = createInvoices();
export const InvoiceLineData = createInvoiceLines(
  ItemData,
  StockLineData,
  InvoiceData
);
