import faker from 'faker';
// randomName
/* eslint-disable prefer-const */
import {
  StockLine,
  Invoice,
  Item,
  InvoiceLine,
  Name,
  Requisition,
  RequisitionLine,
  Stocktake,
  StocktakeLine,
  Location,
  Store,
  MasterListLine,
  MasterList,
} from './types';
import {
  randomFloat,
  addRandomPercentageTo,
  alphaString,
  getFilter,
  randomInteger,
  roundDecimalPlaces,
  takeRandomElementFrom,
  takeRandomPercentageFrom,
  takeRandomSubsetFrom,
} from './../utils';

import { items } from './items';
import { comments } from './comments';
import { names } from './names';
import {
  InvoiceNodeStatus,
  InvoiceNodeType,
  StocktakeNodeStatus,
  RequisitionNodeStatus,
  RequisitionNodeType,
  InvoiceLineNodeType,
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

const getItem = (itemId: string) => {
  const item = ItemData.find(({ id }) => itemId === id);

  if (!item) {
    throw new Error(`Item ${itemId} not found`);
  }

  return item;
};

const getStockLine = (stockLineId: string) => {
  const stockLineIdx = StockLineData.findIndex(({ id }) => stockLineId === id);
  const stockLine = StockLineData[stockLineIdx];
  if (!stockLine) throw new Error(`StockLine ${stockLineId} not found`);

  return { index: stockLineIdx, stockLine: stockLine };
};

export const adjustStockLineTotalNumberOfPacks = (
  stockLineId: string,
  quantity: number
): StockLine => {
  const { index, stockLine } = getStockLine(stockLineId);

  const newQuantity = stockLine.totalNumberOfPacks + quantity;

  if (newQuantity < 0) {
    throw new Error(
      `Quantity invalid - reducing ${stockLine.totalNumberOfPacks} by ${quantity}`
    );
  }

  const newStockLine: StockLine = {
    ...stockLine,
    totalNumberOfPacks: newQuantity,
  };

  StockLineData[index] = newStockLine;

  return newStockLine;
};

export const adjustStockLineAvailableNumberOfPacks = (
  stockLineId: string,
  quantity: number
): StockLine => {
  const { index, stockLine } = getStockLine(stockLineId);

  const newQuantity = stockLine.availableNumberOfPacks + quantity;

  if (newQuantity < 0 || newQuantity > stockLine.totalNumberOfPacks) {
    throw new Error(
      `Quantity invalid - reducing ${stockLine.availableNumberOfPacks} by ${quantity} with a total packs of ${stockLine.totalNumberOfPacks}`
    );
  }

  const newStockLine = {
    ...stockLine,
    availableNumberOfPacks: newQuantity,
  };
  StockLineData[index] = newStockLine;

  return newStockLine;
};

const createLocations = () => {
  return Array.from({ length: 50 }).map(() => ({
    id: faker.datatype.uuid(),
    code: `${alphaString(1)}${faker.datatype.number(9)}`,
    name: `${alphaString(3)}${faker.datatype.number({ min: 100, max: 999 })}`,
    onHold: false,
  }));
};

export const getStockLinesForItem = (
  item: Item,
  stockLines: StockLine[] = StockLineData
): StockLine[] => {
  return stockLines.filter(getFilter(item.id, 'itemId'));
};

export const createItems = (
  // Update this to change the number of items there are.
  numberToCreate = randomInteger({ min: 90, max: 100 })
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

const outboundStatuses: InvoiceNodeStatus[] = [
  InvoiceNodeStatus.New,
  InvoiceNodeStatus.Allocated,
  InvoiceNodeStatus.Picked,
  InvoiceNodeStatus.Shipped,
  InvoiceNodeStatus.Delivered,
  InvoiceNodeStatus.Verified,
];

const inboundStatuses: InvoiceNodeStatus[] = [
  InvoiceNodeStatus.New,
  InvoiceNodeStatus.Picked,
  InvoiceNodeStatus.Shipped,
  InvoiceNodeStatus.Delivered,
  InvoiceNodeStatus.Verified,
];

const createInboundStatusLog = (status: string, createdDatetime: Date) => {
  const statusIdx = inboundStatuses.findIndex(s => status === s);

  const statusTimes: {
    pickedDatetime?: Date;
    shippedDatetime?: Date;
    deliveredDatetime?: Date;
    verifiedDatetime?: Date;
    allocatedDatetime?: Date;
  } = {};

  if (statusIdx >= 1) {
    statusTimes.pickedDatetime = faker.date.future(0.1, createdDatetime);
  }
  if (statusIdx >= 2) {
    statusTimes.shippedDatetime = faker.date.future(
      0.1,
      statusTimes.pickedDatetime
    );
  }
  if (statusIdx >= 3) {
    statusTimes.deliveredDatetime = faker.date.future(
      0.1,
      statusTimes.shippedDatetime
    );
  }

  if (statusIdx >= 4) {
    statusTimes.verifiedDatetime = faker.date.future(
      0.1,
      statusTimes.deliveredDatetime
    );
  }

  return statusTimes;
};

const createOutboundStatusLog = (status: string, createdDatetime: Date) => {
  const statusIdx = outboundStatuses.findIndex(s => status === s);

  const statusTimes: {
    pickedDatetime?: Date;
    allocatedDatetime?: Date;
    shippedDatetime?: Date;
    deliveredDatetime?: Date;
    verifiedDatetime?: Date;
  } = {};

  if (statusIdx >= 1) {
    statusTimes.pickedDatetime = faker.date.future(0.1, createdDatetime);
  }

  if (statusIdx >= 2) {
    statusTimes.allocatedDatetime = faker.date.future(
      0.1,
      statusTimes.pickedDatetime
    );
  }

  if (statusIdx >= 3) {
    statusTimes.shippedDatetime = faker.date.future(
      0.1,
      statusTimes.allocatedDatetime
    );
  }
  if (statusIdx >= 4) {
    statusTimes.deliveredDatetime = faker.date.future(
      0.1,
      statusTimes.shippedDatetime
    );
  }

  if (statusIdx >= 5) {
    statusTimes.verifiedDatetime = faker.date.future(
      0.1,
      statusTimes.deliveredDatetime
    );
  }

  return statusTimes;
};

// const shippingMethods = ['Air', 'Sea', 'Road', 'Rail'];

export const createInvoice = (
  id: string,
  invoiceNumber: number,
  otherParty: Name,
  type: InvoiceNodeType.OutboundShipment | InvoiceNodeType.InboundShipment,
  seeded?: Partial<Invoice>
): Invoice => {
  const confirmed = faker.date.past(1);
  const entered = faker.date.past(0.25, confirmed);

  const status = takeRandomElementFrom(
    type === InvoiceNodeType.InboundShipment
      ? inboundStatuses
      : outboundStatuses
  );
  const statusTimes =
    type === InvoiceNodeType.InboundShipment
      ? createInboundStatusLog(status, entered)
      : createOutboundStatusLog(status, entered);

  const taxPercentage = randomFloat(10, 40);
  const subtotal = randomFloat(100, 1000);
  const totalAfterTax = subtotal * (1 + taxPercentage / 100);

  return {
    id,
    otherPartyId: otherParty.id,
    otherPartyName: otherParty.name,
    invoiceNumber,
    status,
    type,

    totalAfterTax, // This is here for easy sorting

    pricing: {
      __typename: 'InvoicePricingNode',
      totalAfterTax,
      serviceTotalAfterTax: 0,
      serviceTotalBeforeTax: 0,
      stockTotalAfterTax: 0,
      stockTotalBeforeTax: 0,
      totalBeforeTax: 0,
    },

    colour: '#8f90a6',
    comment: takeRandomElementFrom(comments),
    onHold: false,

    createdDatetime: entered.toISOString(),
    allocatedDatetime: statusTimes.allocatedDatetime?.toISOString(),
    pickedDatetime: statusTimes.pickedDatetime?.toISOString(),
    shippedDatetime: statusTimes.shippedDatetime?.toISOString(),
    deliveredDatetime: statusTimes.deliveredDatetime?.toISOString(),
    verifiedDatetime: statusTimes?.verifiedDatetime?.toISOString(),
    // enteredByName: randomName(),
    // donorName: randomName(),
    // otherPartyName: otherParty.name,
    // purchaseOrderNumber: randomInteger({ min: 100, max: 999 }),
    // requisitionNumber: randomInteger({ min: 100, max: 999 }),
    // goodsReceiptNumber: randomInteger({ min: 100, max: 999 }),
    // inboundShipmentNumber: randomInteger({ min: 100, max: 999 }),

    // shippingMethod: takeRandomElementFrom(shippingMethods),
    // transportReference: 'Whats a transport reference?',
    ...seeded,
  };
};
const getStocktakes = (stocktakes = StocktakeData) => stocktakes;
const getStockLines = (stockLines = StockLineData) => stockLines;
const getMasterLists = (masterLists = MasterListData) => masterLists;

const getCustomers = (names = NameData) =>
  names.filter(({ isSupplier }) => isSupplier);
const getSuppliers = (names = NameData) =>
  names.filter(({ isCustomer }) => isCustomer);

const getCustomerRequisitions = () =>
  RequisitionData.filter(({ type }) => type === RequisitionNodeType.Response);

const getSupplierRequisitions = () =>
  RequisitionData.filter(({ type }) => type === RequisitionNodeType.Request);

const getItems = () => [...ItemData];

export const createInvoices = (
  names = NameData,
  numberToCreate = randomInteger({ min: 1, max: 100 })
): Invoice[] => {
  const customers = names.filter(({ isCustomer }) => isCustomer);
  const suppliers = names.filter(({ isSupplier }) => isSupplier);

  const outbounds = Array.from({ length: numberToCreate }).map((_, i) => {
    const name = takeRandomElementFrom(customers);
    const invoice = createInvoice(
      faker.datatype.uuid(),
      i,
      name,
      InvoiceNodeType.OutboundShipment
    );

    return invoice;
  });

  const inbounds = Array.from({ length: numberToCreate }).map((_, i) => {
    const name = takeRandomElementFrom(suppliers);
    const invoice = createInvoice(
      faker.datatype.uuid(),
      i,
      name,
      InvoiceNodeType.InboundShipment
    );

    return invoice;
  });

  return [...outbounds, ...inbounds];
};

export const createCustomers = (
  numberToCreate = randomInteger({ min: 10, max: 100 })
): Name[] => {
  const getNameAndCode = () => {
    return takeRandomElementFrom(names);
  };

  const customers = new Map<string, string>();
  Array.from({ length: numberToCreate }).forEach(() => {
    const { code, name } = getNameAndCode();
    customers.set(name, code);
  });

  return Array.from(customers.entries()).map(([name, code], i) => {
    return {
      id: `customer-${i}`,
      name,
      code,
      isCustomer: true,
      isSupplier: false,
    };
  });
};

export const createSuppliers = (
  numberToCreate = randomInteger({ min: 2, max: 20 })
): Name[] => {
  const getNameAndCode = () => {
    return takeRandomElementFrom(names);
  };

  return Array.from({ length: numberToCreate }).map((_, i) => {
    const { name, code } = getNameAndCode();

    return {
      id: `supplier-${i}`,
      name,
      code,
      isCustomer: false,
      isSupplier: true,
    };
  });
};

const createStockLines = (items: Item[], locations: Location[]) => {
  return items
    .map(item => {
      // Update this to change the number of stock lines per item, per store.
      const numberOfStockLines = randomInteger({ min: 0, max: 3 });

      return Array.from({ length: numberOfStockLines }).map(
        (_, stockLineIdx) => {
          const { id: itemId } = item;

          const costPricePerPack = randomInteger({ min: 10, max: 1000 }) / 100;
          const sellPricePerPack = roundDecimalPlaces(
            addRandomPercentageTo({
              value: costPricePerPack,
              min: 10,
              max: 40,
            }),
            2
          );
          const location = takeRandomElementFrom(locations);

          const stockLine: StockLine = {
            id: `${itemId}-${stockLineIdx}`,
            packSize: takeRandomElementFrom(packSizes),
            expiryDate: faker.date.future(1.5).toISOString(),
            batch: `${alphaString(4)}${faker.datatype.number(1000)}`,
            locationName: location.name,
            locationId: location.id,

            availableNumberOfPacks: 0,
            totalNumberOfPacks: 0,

            storeId: '', // We just use the same data for every store, rather than storing multiple copies of mock data for different stores.
            itemId,
            costPricePerPack,
            sellPricePerPack,
            onHold: faker.datatype.number(10) < 2,
            note: faker.commerce.productDescription(),
            // note:
            //   faker.datatype.number(10) < 4
            //     ? faker.commerce.productDescription()
            //     : null,
          };

          return stockLine;
        }
      );
    })
    .flat();
};

const createInvoiceLine = (
  invoice: Invoice,
  item: Item,
  stockLine: StockLine,
  numberOfPacks = randomInteger({ min: 10, max: 100 })
): InvoiceLine => {
  // +/- this number of packs to change the number of packs
  // each stock line has.

  return {
    id: `${faker.datatype.uuid()}`,
    invoiceId: invoice.id,
    itemId: item.id,
    itemName: item.name,
    itemCode: item.code,
    itemUnit: item.unitName ?? '',

    stockLineId: stockLine.id,
    locationName: stockLine.locationName,
    locationId: stockLine.locationId,
    type:
      invoice.type === InvoiceNodeType.InboundShipment
        ? InvoiceLineNodeType.StockIn
        : InvoiceLineNodeType.StockOut,
    batch: stockLine.batch ?? '',
    expiryDate: stockLine.expiryDate as string,

    costPricePerPack: stockLine.costPricePerPack,
    sellPricePerPack: stockLine.sellPricePerPack,

    numberOfPacks,
    packSize: takeRandomElementFrom(packSizes),
    note: stockLine.note ?? '',
  };
};

const createInvoicesLines = (
  invoices: Invoice[],
  stockLines: StockLine[]
): InvoiceLine[] => {
  const outbounds = invoices.filter(
    ({ type }) => type === InvoiceNodeType.OutboundShipment
  );
  const inbounds = invoices.filter(
    ({ type }) => type === InvoiceNodeType.InboundShipment
  );

  const inboundLines = inbounds
    .map(invoice => {
      // +/- this subset size to change the number of lines per
      // inbound shipment.
      const validStockLines = stockLines.filter(({ onHold }) => !onHold);
      const stockLineSubset = takeRandomSubsetFrom(validStockLines, 200);

      return stockLineSubset.map(stockLine => {
        const item = getItem(stockLine.itemId);

        const invoiceLine = createInvoiceLine(invoice, item, stockLine);
        const numberOfPacks = invoiceLine.numberOfPacks;

        if (invoice.status !== InvoiceNodeStatus.New) {
          adjustStockLineTotalNumberOfPacks(stockLine.id, numberOfPacks);
          adjustStockLineAvailableNumberOfPacks(stockLine.id, numberOfPacks);
        }

        return invoiceLine;
      });
    })
    .flat();

  const outboundLines = outbounds
    .map(invoice => {
      // +/- this subset size to change the number of lines per
      // outbound shipment.
      const validStockLines = stockLines.filter(({ onHold }) => !onHold);
      const stockLineSubset = takeRandomSubsetFrom(validStockLines, 200);

      return stockLineSubset.map(({ id: stockLineId }) => {
        const { stockLine } = getStockLine(stockLineId);
        const item = getItem(stockLine.itemId);

        // +/- this number of packs to change the number of packs
        // each stock line has.
        const numberOfPacks = takeRandomPercentageFrom(
          stockLine.availableNumberOfPacks
        );

        const invoiceLine = createInvoiceLine(
          invoice,
          item,
          stockLine,
          numberOfPacks
        );
        adjustStockLineAvailableNumberOfPacks(stockLine.id, -numberOfPacks);

        if (invoice.status !== InvoiceNodeStatus.New) {
          adjustStockLineTotalNumberOfPacks(stockLine.id, numberOfPacks);
        }

        return invoiceLine;
      });
    })
    .flat();

  return [...inboundLines, ...outboundLines];
};

const createRequisition = (
  otherParty: Name,
  type: RequisitionNodeType
): Requisition => {
  return {
    id: `${faker.datatype.uuid()}`,
    requisitionNumber: faker.datatype.number({ max: 1000 }),
    otherPartyId: otherParty.id,
    createdDatetime: faker.date.past(1.5).toISOString(),
    // requisitionDate: faker.date.past(1.5).toISOString(),
    type,
    maxMonthsOfStock: 3,
    thresholdMonthsOfStock: 3,
    colour: '#8f90a6',
    status: takeRandomElementFrom([
      RequisitionNodeStatus.Draft,
      RequisitionNodeStatus.Finalised,
    ]),
    comment: takeRandomElementFrom(comments),
  };
};

const createSupplierRequisitions = (): Requisition[] => {
  const suppliers = getSuppliers();

  return suppliers
    .map(supplier => {
      const numberOfRequisitions = randomInteger({ min: 0, max: 3 });

      return Array.from({ length: numberOfRequisitions }).map(() => {
        const requisition: Requisition = createRequisition(
          supplier,
          RequisitionNodeType.Request
        );
        return requisition;
      });
    })
    .flat();
};

const createCustomerRequisitions = (): Requisition[] => {
  const customers = getCustomers();

  return customers
    .map(customer => {
      const numberOfRequisitions = randomInteger({ min: 0, max: 3 });

      return Array.from({ length: numberOfRequisitions }).map(() => {
        const requisition: Requisition = createRequisition(
          customer,
          RequisitionNodeType.Response
        );

        return requisition;
      });
    })
    .flat();
};

const createSupplierRequisitionLines = (): RequisitionLine[] => {
  const supplierRequisitions = getSupplierRequisitions();
  const items = getItems();

  return supplierRequisitions
    .map(req => {
      const itemsSubset = takeRandomSubsetFrom(items, 10);

      return itemsSubset
        .map(item => {
          return createRequisitionLine(req, item);
        })
        .flat();
    })
    .flat();
};

const getRandomFloat = () => faker.datatype.float({ min: 0, max: 100 });

export const createRequisitionLine = (req: Requisition, item: Item) => ({
  id: faker.datatype.uuid(),
  requisitionId: req.id,
  closingQuantity: getRandomFloat(),
  comment: '',
  expiredQuantity: getRandomFloat(),
  imprestQuantity: getRandomFloat(),
  issuedQuantity: getRandomFloat(),
  itemCode: item.code,
  itemName: item.name,
  itemUnit: item.unitName ?? '',
  itemId: item.id,
  monthlyConsumption: getRandomFloat(),
  monthsOfSupply: getRandomFloat(),
  openingQuantity: getRandomFloat(),
  otherPartyClosingQuantity: getRandomFloat(),
  previousQuantity: getRandomFloat(),
  previousStockOnHand: getRandomFloat(),
  receivedQuantity: getRandomFloat(),
  calculatedQuantity: getRandomFloat(),
  requestedQuantity: getRandomFloat(),
  stockAdditions: getRandomFloat(),
  stockLosses: getRandomFloat(),
  supplyQuantity: getRandomFloat(),
});

const createCustomerRequisitionLines = (): RequisitionLine[] => {
  const customerRequisitions = getCustomerRequisitions();
  const items = getItems();

  return customerRequisitions
    .map(req => {
      const itemsSubset = takeRandomSubsetFrom(items, 10);

      return itemsSubset
        .map(item => {
          return createRequisitionLine(req, item);
        })
        .flat();
    })
    .flat();
};

const createStocktake = (): Stocktake => {
  return {
    id: faker.datatype.uuid(),
    storeId: '',
    stocktakeNumber: faker.datatype.number({ max: 1000 }),
    createdDatetime: faker.date.past(1.5).toISOString(),
    comment: takeRandomElementFrom(comments),
    description: takeRandomElementFrom(comments),
    status: takeRandomElementFrom([
      StocktakeNodeStatus.New,
      StocktakeNodeStatus.Finalised,
    ]),
    // entryDatetime: faker.date.past(1.5).toISOString(),
    // enteredByName: randomName(),
    // onHold: faker.datatype.boolean(),
  };
};

const createStocktakes = (): Stocktake[] => {
  return Array.from({ length: faker.datatype.number({ min: 0, max: 20 }) }).map(
    () => {
      return createStocktake();
    }
  );
};

export const createStocktakeLine = (
  stocktakeId: string,
  item: Item,
  stockLine?: StockLine
): StocktakeLine => {
  return {
    id: faker.datatype.uuid(),
    batch: stockLine?.batch,
    costPricePerPack: stockLine?.costPricePerPack,
    sellPricePerPack: stockLine?.sellPricePerPack,
    countedNumberOfPacks: stockLine?.totalNumberOfPacks,
    expiryDate: stockLine?.expiryDate,
    itemId: item.id,
    snapshotNumberOfPacks: stockLine?.totalNumberOfPacks ?? 0,
    packSize: stockLine?.packSize,
    stocktakeId,
  };
};

const createStocktakeLines = (): StocktakeLine[] => {
  const stocktakes = getStocktakes();

  return stocktakes
    .map(stocktake => {
      const itemsSubset = takeRandomSubsetFrom(ItemData, 50);
      return itemsSubset.map(item => createStocktakeLine(stocktake.id, item));
    })
    .flat();
};

const createMasterList = (n: number): MasterList => ({
  id: faker.datatype.uuid(),
  code: `LIST${n}`,
  description: faker.company.catchPhrase(),
  name: `Master List ${n}`,
});

const createMasterLists = (): MasterList[] => {
  return Array.from({ length: faker.datatype.number({ min: 0, max: 50 }) }).map(
    (_, idx) => {
      return createMasterList(idx);
    }
  );
};

export const createMasterListLine = (
  masterListId: string,
  item: Item
): MasterListLine => ({
  id: faker.datatype.uuid(),
  masterListId,
  itemId: item.id,
});

const createMasterListLines = (): MasterListLine[] => {
  const masterLists = getMasterLists();
  const stockLines = getStockLines();

  return masterLists
    .map(masterList => {
      const stockLineSubset = takeRandomSubsetFrom(stockLines, 10);
      return stockLineSubset.map(seed => {
        const item = getItem(seed.itemId);
        return createMasterListLine(masterList.id, item);
      });
    })
    .flat();
};

export const createStores = (
  numberToCreate = randomInteger({ min: 10, max: 100 })
): Store[] =>
  Array.from({ length: numberToCreate }).map(() => ({
    id: `${faker.datatype.uuid()}`,
    code: faker.company.companyName(),
    nameId: '',
  }));

export const removeElement = (source: any[], idx: number): void => {
  source = source.splice(idx, 1);
};

export let StoreData = createStores();
export let NameData = [...createCustomers(), ...createSuppliers()];
export let ItemData = createItems();
export let InvoiceData = createInvoices(NameData);
export let LocationData = createLocations();
export let StockLineData = createStockLines(ItemData, LocationData);
export let InvoiceLineData = createInvoicesLines(InvoiceData, StockLineData);
export let RequisitionData = [
  ...createSupplierRequisitions(),
  ...createCustomerRequisitions(),
];

export let RequisitionLineData = [
  ...createSupplierRequisitionLines(),
  ...createCustomerRequisitionLines(),
];

export let StocktakeData = createStocktakes();
export let StocktakeLineData = createStocktakeLines();

export let MasterListData = createMasterLists();
export let MasterListLineData = createMasterListLines();
