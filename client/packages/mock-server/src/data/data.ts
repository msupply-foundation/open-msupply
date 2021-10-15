/* eslint-disable prefer-const */
import { StockLine, Invoice, Item, InvoiceLine, Name } from './types';
import { getFilter, randomInteger } from './../utils';
import faker from 'faker';
import {
  takeRandomElementFrom,
  takeRandomNumberFrom,
  takeRandomPercentageFrom,
  takeRandomSubsetFrom,
} from '../utils';
import { items } from './items';
import { comments } from './comments';
import { names } from './names';

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
        expiry: faker.date.future(0.5).toString(),
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
  numberToCreate = randomInteger({ min: 10, max: 20 })
): Item[] => {
  return items.slice(0, numberToCreate).map(({ code, name }, j) => {
    const itemId = `item-${j}`;

    const item = {
      id: itemId,
      code,
      name,
    };

    return item;
  });
};

export const createInvoice = (
  id: string,
  invoiceNumber: number,
  nameId: string,
  seeded?: Partial<Invoice>
): Invoice => {
  const confirmed = faker.date.past(1);
  const entered = faker.date.past(0.25, confirmed);

  return {
    id,
    nameId,
    invoiceNumber,
    status: takeRandomElementFrom(['Confirmed', 'Finalised']),
    entered: entered.toString(),
    confirmed: confirmed.toString(),
    total: `$${faker.commerce.price()}`,
    color: 'grey',
    type: 'Customer invoice',
    comment: takeRandomElementFrom(comments),
    ...seeded,
  };
};

const createInvoices = (
  customers = NameData,
  numberToCreate = randomInteger({ min: 10, max: 100 })
): Invoice[] => {
  return Array.from({ length: numberToCreate }).map((_, i) => {
    const name = takeRandomElementFrom(customers);
    const invoice = createInvoice(faker.datatype.uuid(), i, name.id);

    return invoice;
  });
};

const createCustomers = (
  numberToCreate = randomInteger({ min: 10, max: 100 })
): Name[] => {
  const getNameAndCode = () => {
    return takeRandomElementFrom(names);
  };

  return Array.from({ length: numberToCreate }).map((_, i) => {
    const { name, code } = getNameAndCode();
    return {
      id: `${i}`,
      name,
      code,
      isCustomer: true,
      isSupplier: false,
    };
  });
};

export const removeElement = (source: any[], idx: number): void => {
  source = source.splice(idx, 1);
};

export let NameData = createCustomers();
export let ItemData = createItems();
export let StockLineData = createStockLines(ItemData);
export let InvoiceData = createInvoices(NameData);
export let InvoiceLineData = createInvoiceLines(
  ItemData,
  StockLineData,
  InvoiceData
);
