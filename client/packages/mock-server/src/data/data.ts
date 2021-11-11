import { randomFloat, randomName } from './../utils';
/* eslint-disable prefer-const */
import { Store, StockLine, Invoice, Item, InvoiceLine, Name } from './types';
import {
  addRandomPercentageTo,
  alphaString,
  getFilter,
  randomInteger,
  roundDecimalPlaces,
} from './../utils';
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
import {
  InvoiceNodeStatus,
  InvoiceNodeType,
} from '@openmsupply-client/common/src/types/schema';

const units = [
  'Tablet',
  'Tab',
  'Bottle',
  'Roll',
  'Vial',
  'Each',
  'Sachet',
  'Ampoule',
  'Capsule',
  'Amp',
];

const packSizes = [1, 1, 1, 1, 10, 100];

const locations = Array.from({ length: 50 }).map(() => ({
  id: faker.datatype.uuid(),
  description: `${alphaString(1)}${faker.datatype.number(9)}`,
  code: `${alphaString(3)}${faker.datatype.number({ min: 100, max: 999 })}`,
}));

export const getStockLinesForItem = (
  item: Item,
  stockLines: StockLine[] = StockLineData
): StockLine[] => {
  return stockLines.filter(getFilter(item.id, 'itemId'));
};

export const createStockLines = (
  items: Item[],
  stores: Store[]
): StockLine[] => {
  const stockLines: StockLine[] = [];

  stores.forEach(store => {
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

        const costPricePerPack = randomInteger({ min: 10, max: 1000 }) / 100;
        const sellPricePerPack = roundDecimalPlaces(
          addRandomPercentageTo({ value: costPricePerPack, min: 10, max: 40 }),
          2
        );

        const stockLine: StockLine = {
          id: `${itemId}-${store.id}-${i++}`,
          packSize: takeRandomElementFrom(packSizes),
          expiryDate: faker.date.future(1.5).toISOString(),
          batch: `${alphaString(4)}${faker.datatype.number(1000)}`,
          locationDescription: `${alphaString(1)}${faker.datatype.number(9)}`,
          location: takeRandomElementFrom(locations),
          storeId: store.id,
          availableNumberOfPacks,
          totalNumberOfPacks:
            availableNumberOfPacks + randomInteger({ min: 0, max: 5 }),
          itemId,
          costPricePerPack,
          sellPricePerPack,
          onHold: faker.datatype.number(10) < 2,
          note:
            faker.datatype.number(10) < 4
              ? faker.commerce.productDescription()
              : null,
        };

        quantityToUse = quantityToUse - availableNumberOfPacks;

        stockLines.push(stockLine);
      }
    });
  });

  return stockLines.flat();
};

export const createInvoiceLines = (
  items: Item[],
  stockLines: StockLine[],
  invoices: Invoice[]
): InvoiceLine[] => {
  const invoiceLines: InvoiceLine[][] = [];

  invoices.forEach(invoice => {
    takeRandomSubsetFrom(items, 50).forEach(item => {
      const stockLinesToUse = takeRandomSubsetFrom(
        getStockLinesForItem(item, stockLines),
        2
      );

      const invoiceLinesForStockLines = stockLinesToUse.map(
        (stockLine: Omit<StockLine, 'item'>) => {
          const { availableNumberOfPacks } = stockLine;

          const numberOfPacks = takeRandomPercentageFrom(
            availableNumberOfPacks as number
          );

          const costPricePerPack = randomInteger({ min: 10, max: 1000 }) / 100;
          const sellPricePerPack = roundDecimalPlaces(
            addRandomPercentageTo({
              value: costPricePerPack,
              min: 10,
              max: 40,
            }),
            2
          );

          const invoiceLine: InvoiceLine = {
            id: `${faker.datatype.uuid()}`,
            invoiceId: invoice.id,
            itemId: item.id,
            itemName: item.name,
            itemCode: item.code,
            itemUnit: item.unitName ?? '',

            stockLineId: stockLine.id,
            locationDescription: stockLine.locationDescription,
            location: stockLine.location,

            batch: stockLine.batch ?? '',
            expiryDate: stockLine.expiryDate,

            costPricePerPack,
            sellPricePerPack,
            quantity: numberOfPacks,
            numberOfPacks,
            packSize: takeRandomElementFrom(packSizes),
            note: stockLine.note ?? '',
          };

          stockLine.availableNumberOfPacks =
            (stockLine.availableNumberOfPacks as number) - numberOfPacks;

          return invoiceLine;
        }
      );

      invoiceLines.push(invoiceLinesForStockLines);
    });
  });

  return invoiceLines.flat();
};

export const createItems = (
  numberToCreate = randomInteger({ min: 50, max: 100 })
): Item[] => {
  return items.slice(0, numberToCreate).map(({ code, name }, j) => {
    const itemId = `item-${j}`;

    const item = {
      id: itemId,
      code,
      name,
      unitName: takeRandomElementFrom(units),
      isVisible: faker.datatype.boolean(),
    };

    return item;
  });
};

const statuses: InvoiceNodeStatus[] = [
  InvoiceNodeStatus.Draft,
  InvoiceNodeStatus.Allocated,
  InvoiceNodeStatus.Picked,
  InvoiceNodeStatus.Shipped,
  InvoiceNodeStatus.Delivered,
];

const createStatusLog = (status: string, entered: Date) => {
  const statusIdx = statuses.findIndex(s => status === s);

  const statusTimes: {
    draftDatetime?: Date;
    allocatedDatetime?: Date;
    pickedDatetime?: Date;
    shippedDatetime?: Date;
    deliveredDatetime?: Date;
  } = {};

  if (statusIdx >= 0) {
    statusTimes.draftDatetime = faker.date.future(0.1, entered);
  }
  if (statusIdx >= 1) {
    statusTimes.allocatedDatetime = faker.date.future(
      0.1,
      statusTimes.draftDatetime
    );
  }
  if (statusIdx >= 2) {
    statusTimes.pickedDatetime = faker.date.future(
      0.1,
      statusTimes.allocatedDatetime
    );
  }
  if (statusIdx >= 3) {
    statusTimes.shippedDatetime = faker.date.future(
      0.1,
      statusTimes.pickedDatetime
    );
  }

  if (statusIdx >= 4) {
    statusTimes.deliveredDatetime = faker.date.future(
      0.1,
      statusTimes.shippedDatetime
    );
  }

  return statusTimes;
};

const shippingMethods = ['Air', 'Sea', 'Road', 'Rail'];

export const createInvoice = (
  id: string,
  invoiceNumber: number,
  otherParty: Name,
  seeded?: Partial<Invoice>
): Invoice => {
  const confirmed = faker.date.past(1);
  const entered = faker.date.past(0.25, confirmed);

  const status = takeRandomElementFrom(statuses);
  const statusTimes = createStatusLog(status, entered);

  const taxPercentage = randomFloat(10, 40);
  const subtotal = randomFloat(100, 1000);
  const totalAfterTax = subtotal * (1 + taxPercentage / 100);

  return {
    id,
    otherPartyId: otherParty.id,
    invoiceNumber,
    status,
    entryDatetime: entered.toISOString(),
    confirmedDatetime: confirmed.toISOString(),
    finalisedDatetime: null,
    totalAfterTax,
    pricing: {
      __typename: 'InvoicePricingNode',
      totalAfterTax,
      subtotal,
      taxPercentage,
    },
    color: 'grey',
    type: InvoiceNodeType.OutboundShipment,
    comment: takeRandomElementFrom(comments),
    onHold: false,
    draftDatetime: statusTimes.draftDatetime?.toISOString(),
    allocatedDatetime: statusTimes.allocatedDatetime?.toISOString(),
    pickedDatetime: statusTimes.pickedDatetime?.toISOString(),
    shippedDatetime: statusTimes.shippedDatetime?.toISOString(),
    deliveredDatetime: statusTimes.deliveredDatetime?.toISOString(),
    enteredByName: randomName(),
    donorName: randomName(),
    otherPartyName: otherParty.name,
    purchaseOrderNumber: randomInteger({ min: 100, max: 999 }),
    requisitionNumber: randomInteger({ min: 100, max: 999 }),
    goodsReceiptNumber: randomInteger({ min: 100, max: 999 }),
    inboundShipmentNumber: randomInteger({ min: 100, max: 999 }),
    shippingMethod: takeRandomElementFrom(shippingMethods),
    transportReference: 'Whats a transport reference?',
    ...seeded,
  };
};

export const createInvoices = (
  customers = NameData,
  stores: Store[],
  numberToCreate = randomInteger({ min: 1, max: 100 })
): Invoice[] => {
  const invoices = stores
    .map(() => {
      return Array.from({ length: numberToCreate }).map((_, i) => {
        const name = takeRandomElementFrom(customers);
        const invoice = createInvoice(faker.datatype.uuid(), i, name);

        return invoice;
      });
    })
    .flat();

  return invoices;
};

export const createCustomers = (
  numberToCreate = randomInteger({ min: 10, max: 100 })
): Name[] => {
  const getNameAndCode = () => {
    return takeRandomElementFrom(names);
  };

  const customers = new Map();
  Array.from({ length: numberToCreate }).forEach(() => {
    const { code, name } = getNameAndCode();
    customers.set(name, code);
  });

  return Array.from(customers.entries()).map(([name, code], i) => {
    return {
      id: `${i}`,
      name,
      code,
      isCustomer: true,
      isSupplier: false,
    };
  });
};

export const createSuppliers = (
  numberToCreate = randomInteger({ min: 2, max: 2 })
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
      isCustomer: false,
      isSupplier: true,
    };
  });
};

export const removeElement = (source: any[], idx: number): void => {
  source = source.splice(idx, 1);
};

const createStores = (names: Name[]): Store[] => {
  const suppliers = names.filter(({ isSupplier }) => isSupplier);

  const stores: Store[] = suppliers.map(({ id, code }) => ({
    id,
    nameId: id,
    code,
  }));

  return stores;
};

export let NameData = [...createCustomers(), ...createSuppliers()];
export let ItemData = createItems();
export let StoreData = createStores(NameData);
export let StockLineData = createStockLines(ItemData, StoreData);
export let InvoiceData = createInvoices(NameData, StoreData);
export let InvoiceLineData = createInvoiceLines(
  ItemData,
  StockLineData,
  InvoiceData
);
