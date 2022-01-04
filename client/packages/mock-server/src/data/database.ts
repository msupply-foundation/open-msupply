import { randomName } from './../utils';
import parse from 'date-fns/parse';
import faker from 'faker';
import {
  InsertLocationInput,
  UpdateLocationInput,
  UpdateInboundShipmentLineInput,
  InvoiceLineNodeType,
  InvoiceNodeStatus,
  DeleteResponse,
  InsertSupplierRequisitionInput,
  UpdateSupplierRequisitionInput,
  DeleteSupplierRequisitionInput,
  InsertCustomerRequisitionInput,
  UpdateCustomerRequisitionInput,
  DeleteCustomerRequisitionInput,
  InsertSupplierRequisitionLineInput,
  UpdateSupplierRequisitionLineInput,
  DeleteSupplierRequisitionLineInput,
  UpdateInboundShipmentInput,
  InsertCustomerRequisitionLineInput,
  UpdateCustomerRequisitionLineInput,
  DeleteCustomerRequisitionLineInput,
  InsertStocktakeLineInput,
  UpdateStocktakeLineInput,
  DeleteStocktakeLineInput,
  UpdateOutboundShipmentInput,
  InsertOutboundShipmentLineInput,
  InsertInboundShipmentLineInput,
  SupplierRequisitionNodeStatus,
  RequisitionNodeType,
  InsertStocktakeInput,
  UpdateStocktakeInput,
  DeleteStocktakeInput,
  StocktakeNodeStatus,
} from '@openmsupply-client/common/src/types/schema';
import {
  Item,
  StockLine,
  Invoice,
  InvoiceLine,
  Name,
  Requisition,
  RequisitionLine,
  Stocktake,
  StocktakeLine,
  Location,
} from './types';
import {
  LocationData,
  InvoiceData,
  InvoiceLineData,
  ItemData,
  StockLineData,
  NameData,
  removeElement,
  RequisitionData,
  RequisitionLineData,
  createRequisitionLine,
  StocktakeData,
  StocktakeLineData,
  createStocktakeLine,
} from './data';

import {
  isAlmostExpired,
  isExpired,
  isThisWeek,
  isToday,
} from '@openmsupply-client/common/src/utils/dateFunctions';

// Importing this from utils causes a circular deps loop and you will not have fun :)
export const getFilter =
  <T>(matchVal: unknown, key: keyof T) =>
  (obj: T): boolean =>
    obj[key] === matchVal;

export const invoice = {
  get: {
    byInvoiceNumber: (invoiceNumber: number): Invoice =>
      ({
        ...InvoiceData.find(getFilter(invoiceNumber, 'invoiceNumber')),
      } as Invoice),
  },
};

export const location = {
  get: {
    byId: (id: string): Location => {
      const location = LocationData.find(getFilter(id, 'id'));

      if (!location) {
        throw new Error(`Location with id ${id} not found`);
      }

      return location;
    },
    all: (): Location[] => {
      return LocationData;
    },
  },
  insert: (vars: InsertLocationInput): Location => {
    const newLocation = {
      onHold: vars?.onHold ?? false,
      stock: [],
      name: vars.name ?? '',
      id: vars.id,
      code: vars.code,
    };

    LocationData.push(newLocation);

    return newLocation;
  },
  update: (vars: UpdateLocationInput): Location => {
    const idx = LocationData.findIndex(getFilter(vars.id, 'id'));

    if (idx === -1) {
      throw new Error(`Location with id ${vars.id} not found`);
    }

    const updatedLocation = {
      ...LocationData[idx],
      ...vars,
      name: vars.name ?? '',
      code: vars.code ?? '',
      onHold: vars.onHold ?? false,
    };

    LocationData[idx] = updatedLocation;

    return updatedLocation;
  },
};

export const stocktakeLine = {
  get: {
    byId: (id: string): StocktakeLine => {
      const stocktakeLine = StocktakeLineData.find(getFilter(id, 'id'));
      if (!stocktakeLine) {
        throw new Error(`Could not find stocktakeLine line with id: ${id}`);
      }

      return {
        ...stocktakeLine,
      };
    },
    byStocktakeId: (stocktakeId: string): StocktakeLine[] => {
      const lines = StocktakeLineData.filter(
        getFilter(stocktakeId, 'stocktakeId')
      );

      return [...lines];
    },
  },
  insert: (input: InsertStocktakeLineInput): StocktakeLine => {
    const item = ItemData.find(getFilter(input.itemId, 'id'));
    if (!item) {
      throw new Error(`Could not find item with id: ${input.itemId}`);
    }

    const line = { ...createStocktakeLine(input.stocktakeId, item), ...input };
    StocktakeLineData.push(line);
    return line;
  },
  update: (input: UpdateStocktakeLineInput): StocktakeLine => {
    const index = StocktakeLineData.findIndex(getFilter(input.id, 'id'));
    const line = StocktakeLineData[index] as StocktakeLine;
    if (!line) {
      throw new Error(`Could not find line with id: ${input.id}`);
    }

    const updatedLine = { ...line, ...input } as StocktakeLine;
    StocktakeLineData[index] = updatedLine;

    return updatedLine;
  },
  delete: (input: DeleteStocktakeLineInput): DeleteResponse => {
    const index = StocktakeLineData.findIndex(getFilter(input.id, 'id'));
    if (!(index >= 0))
      throw new Error(`Could not find line to delete with id: ${input.id}`);
    removeElement(StocktakeLineData, index);
    return input;
  },
};

export const stocktake = {
  get: {
    byId: (id: string): Stocktake => {
      const stocktake = StocktakeData.find(getFilter(id, 'id'));
      if (!stocktake) {
        throw new Error('Stocktake not found');
      }
      return stocktake;
    },

    list: (): Stocktake[] => [...StocktakeData],
  },
  insert: (input: InsertStocktakeInput): Stocktake => {
    const stocktakeNumber = faker.datatype.number({ max: 1000 });
    const status = StocktakeNodeStatus.Suggested;

    const stocktake = {
      ...input,
      stocktakeNumber,
      status,
      entryDatetime: new Date().toISOString(),
      enteredByName: randomName(),
      onHold: false,
    };
    StocktakeData.push(stocktake);
    return stocktake;
  },
  update: (input: UpdateStocktakeInput): Stocktake => {
    const index = StocktakeData.findIndex(getFilter(input.id, 'id'));
    const req = StocktakeData[index] as Stocktake;
    if (!req) {
      throw new Error(`Could not find stocktake with id: ${input.id}`);
    }

    const updatedStocktake = { ...req, ...input } as Stocktake;
    StocktakeData[index] = updatedStocktake;

    return updatedStocktake;
  },
  delete: (input: DeleteStocktakeInput): DeleteResponse => {
    const index = StocktakeData.findIndex(getFilter(input.id, 'id'));
    if (!(index >= 0))
      throw new Error(
        `Could not find stocktake to delete with id: ${input.id}`
      );
    removeElement(StocktakeData, index);
    return input;
  },
};

export const stockLine = {
  get: {
    byId: (id: string): StockLine => {
      const stockLine = StockLineData.find(getFilter(id, 'id'));
      if (!stockLine) {
        throw new Error('Stock line not found');
      }
      return stockLine;
    },
    all: (): StockLine[] => [...StockLineData],
    byItemId: (itemId: string): StockLine[] => {
      const stockLines = StockLineData.filter(getFilter(itemId, 'itemId'));
      return stockLines;
    },
  },
};

export const item = {
  get: {
    byId: (id: string): Item => {
      const item = ItemData.find(getFilter(id, 'id'));
      if (!item) {
        throw new Error(`Item with id ${id} not found`);
      }
      return item;
    },
    all: (): Item[] => {
      return [...ItemData];
    },
  },
};

export const requisition = {
  get: {
    byId: (id: string): Requisition => {
      const req = RequisitionData.find(getFilter(id, 'id'));
      if (!req) throw new Error(`Could not find requisition with id: ${id}`);
      return {
        ...req,
      };
    },
    list: (): Requisition[] => {
      return [...RequisitionData];
    },
  },
  supplier: {
    insert: (input: InsertSupplierRequisitionInput): Requisition => {
      const requisitionNumber = faker.datatype.number({ max: 1000 });
      const storeId = '';
      const status = SupplierRequisitionNodeStatus.Draft;
      const type = input.type || RequisitionNodeType.SupplierRequisition;
      const req = { ...input, requisitionNumber, storeId, status, type };
      RequisitionData.push(req);
      return req;
    },
    update: (input: UpdateSupplierRequisitionInput): Requisition => {
      const index = RequisitionData.findIndex(getFilter(input.id, 'id'));
      const req = RequisitionData[index] as Requisition;
      if (!req) {
        throw new Error(`Could not find requisition with id: ${input.id}`);
      }

      const updatedReq = { ...req, ...input } as Requisition;
      RequisitionData[index] = updatedReq;

      return updatedReq;
    },
    delete: (input: DeleteSupplierRequisitionInput): DeleteResponse => {
      const index = RequisitionData.findIndex(getFilter(input.id, 'id'));
      if (!(index >= 0))
        throw new Error(
          `Could not find requisition to delete with id: ${input.id}`
        );
      removeElement(RequisitionData, index);
      return input;
    },
  },
  customer: {
    insert: (input: InsertCustomerRequisitionInput): Requisition => {
      const requisitionNumber = faker.datatype.number({ max: 1000 });
      const storeId = '';
      const status = SupplierRequisitionNodeStatus.Draft;
      const type = input.type || RequisitionNodeType.CustomerRequisition;
      const req = { ...input, requisitionNumber, storeId, status, type };
      RequisitionData.push(req);
      return req;
    },
    update: (input: UpdateCustomerRequisitionInput): Requisition => {
      const index = RequisitionData.findIndex(getFilter(input.id, 'id'));
      const req = RequisitionData[index] as Requisition;
      if (!req) {
        throw new Error(`Could not find requisition with id: ${input.id}`);
      }

      const updatedReq = { ...req, ...input } as Requisition;
      RequisitionData[index] = updatedReq;

      return updatedReq;
    },
    delete: (input: DeleteCustomerRequisitionInput): DeleteResponse => {
      const index = RequisitionData.findIndex(getFilter(input.id, 'id'));
      if (!(index >= 0))
        throw new Error(
          `Could not find requisition to delete with id: ${input.id}`
        );
      removeElement(RequisitionData, index);
      return input;
    },
  },
};

const requisitionLine = {
  get: {
    byId: (id: string): RequisitionLine => {
      const reqLine = RequisitionLineData.find(getFilter(id, 'id'));
      if (!reqLine) {
        throw new Error(`Could not find reqLine line with id: ${id}`);
      }

      return {
        ...reqLine,
      };
    },
    byRequisitionId: (requisitionId: string): RequisitionLine[] => {
      const lines = RequisitionLineData.filter(
        getFilter(requisitionId, 'requisitionId')
      );

      return [...lines];
    },
  },
  supplier: {
    insert: (input: InsertSupplierRequisitionLineInput): RequisitionLine => {
      const item = ItemData.find(getFilter(input.itemId, 'id'));
      if (!item) {
        throw new Error(`Could not find item with id: ${input.itemId}`);
      }
      const req = RequisitionData.find(getFilter(input.requisitionId, 'id'));
      if (!req) {
        throw new Error(
          `Could not find requisition with id: ${input.requisitionId}`
        );
      }

      const line = { ...createRequisitionLine(req, item), ...input };
      RequisitionLineData.push(line);
      return line;
    },
    update: (input: UpdateSupplierRequisitionLineInput): RequisitionLine => {
      const index = RequisitionLineData.findIndex(getFilter(input.id, 'id'));
      const line = RequisitionLineData[index] as RequisitionLine;
      if (!line) {
        throw new Error(`Could not find line with id: ${input.id}`);
      }

      const updatedLine = { ...line, ...input } as RequisitionLine;
      RequisitionLineData[index] = updatedLine;

      return updatedLine;
    },
    delete: (input: DeleteSupplierRequisitionLineInput): DeleteResponse => {
      const index = RequisitionLineData.findIndex(getFilter(input.id, 'id'));
      if (!(index >= 0))
        throw new Error(`Could not find line to delete with id: ${input.id}`);
      removeElement(RequisitionLineData, index);
      return input;
    },
  },
  customer: {
    insert: (input: InsertCustomerRequisitionLineInput): RequisitionLine => {
      const item = ItemData.find(getFilter(input.itemId, 'id'));
      if (!item) {
        throw new Error(`Could not find item with id: ${input.itemId}`);
      }
      const req = RequisitionData.find(getFilter(input.requisitionId, 'id'));
      if (!req) {
        throw new Error(
          `Could not find requisition with id: ${input.requisitionId}`
        );
      }

      const line = createRequisitionLine(req, item);
      RequisitionLineData.push(line);
      return line;
    },
    update: (input: UpdateCustomerRequisitionLineInput): RequisitionLine => {
      const index = RequisitionLineData.findIndex(getFilter(input.id, 'id'));
      const line = RequisitionLineData[index] as RequisitionLine;
      if (!line) {
        throw new Error(`Could not find line with id: ${input.id}`);
      }

      const updatedLine = { ...line, ...input } as RequisitionLine;
      RequisitionLineData[index] = updatedLine;

      return updatedLine;
    },
    delete: (input: DeleteCustomerRequisitionLineInput): DeleteResponse => {
      const index = RequisitionLineData.findIndex(getFilter(input.id, 'id'));
      if (!(index >= 0))
        throw new Error(`Could not find line to delete with id: ${input.id}`);
      removeElement(RequisitionLineData, index);
      return input;
    },
  },
};

export const get = {
  id: {
    item: (id: string): number => ItemData.findIndex(getFilter(id, 'id')),
    stockLine: (id: string): number =>
      StockLineData.findIndex(getFilter(id, 'id')),
    invoice: (id: string): number => InvoiceData.findIndex(getFilter(id, 'id')),
    invoiceLine: (id: string): number =>
      InvoiceLineData.findIndex(getFilter(id, 'id')),
  },

  byId: {
    item: (id: string): Item =>
      ({
        ...ItemData.find(getFilter(id, 'id')),
      } as Item),
    stockLine: (id: string): StockLine =>
      ({
        ...StockLineData.find(getFilter(id, 'id')),
      } as StockLine),
    invoice: (id: string): Invoice =>
      ({
        ...InvoiceData.find(getFilter(id, 'id')),
      } as Invoice),
    invoiceLine: (id: string): InvoiceLine =>
      ({
        ...InvoiceLineData.find(getFilter(id, 'id')),
      } as InvoiceLine),
    name: (id: string): Name =>
      ({
        ...NameData.find(getFilter(id, 'id')),
      } as Name),
  },

  all: {
    item: (): Item[] => ItemData.slice(),
    stockLine: (): StockLine[] => StockLineData.slice(),
    invoice: (): Invoice[] => InvoiceData.slice(),
    invoiceLine: (): InvoiceLine[] => InvoiceLineData.slice(),
    name: (): Name[] => NameData.slice(),
  },

  stockLines: {
    byItemId: (itemId: string): StockLine[] =>
      StockLineData.filter(getFilter(itemId, 'itemId')),
  },

  invoiceLines: {
    byInvoiceId: (invoiceId: string): InvoiceLine[] =>
      InvoiceLineData.filter(getFilter(invoiceId, 'invoiceId')),
  },
  statistics: {
    inboundShipment: {
      created: {
        today: InvoiceData.filter(
          invoice =>
            invoice.type === 'INBOUND_SHIPMENT' &&
            isToday(new Date(invoice.createdDatetime))
        ).length,
        thisWeek: InvoiceData.filter(
          invoice =>
            invoice.type === 'INBOUND_SHIPMENT' &&
            isThisWeek(new Date(invoice.createdDatetime))
        ).length,
      },
    },
    outboundShipment: {
      created: {
        today: InvoiceData.filter(
          invoice =>
            invoice.type === 'OUTBOUND_SHIPMENT' &&
            isToday(new Date(invoice.createdDatetime))
        ).length,
        thisWeek: InvoiceData.filter(
          invoice =>
            invoice.type === 'OUTBOUND_SHIPMENT' &&
            isThisWeek(new Date(invoice.createdDatetime))
        ).length,

        // TODO: Not supported currently.
        toBePicked: InvoiceData.filter(
          invoice => invoice.status === InvoiceNodeStatus.Picked
        ).length,
      },
    },
    stock: {
      expired: StockLineData.filter(stockLine =>
        isExpired(new Date(stockLine.expiryDate as string))
      ).length,
      expiringSoon: StockLineData.filter(stockLine =>
        isAlmostExpired(new Date(stockLine.expiryDate as string))
      ).length,
    },
  },
};

export const update = {
  invoice: (
    invoice: (UpdateOutboundShipmentInput | UpdateInboundShipmentInput) & {
      allocatedDatetime?: string;
      shippedDatetime?: string;
      pickedDatetime?: string;
    }
  ): Invoice => {
    const idx = InvoiceData.findIndex(getFilter(invoice.id, 'id'));
    if (idx < 0) throw new Error('Invalid invoice id');
    const existingInvoice: Invoice = InvoiceData[idx] as Invoice;
    const newInvoice: Invoice = {
      ...existingInvoice,
      color: invoice?.color ?? existingInvoice.color,
      comment: invoice?.comment ?? existingInvoice.comment,
      theirReference: invoice?.theirReference ?? existingInvoice.theirReference,
      onHold: invoice?.onHold ?? existingInvoice.onHold,
      status:
        (invoice?.status as unknown as InvoiceNodeStatus) ??
        existingInvoice.status,
      otherPartyId: invoice?.otherPartyId ?? existingInvoice.otherPartyId,
      // allocatedDatetime:
      //   invoice?.allocatedDatetime ?? existingInvoice.allocatedDatetime,
      // shippedDatetime:
      //   invoice?.shippedDatetime ?? existingInvoice.shippedDatetime,
      // pickedDatetime: invoice?.pickedDatetime ?? existingInvoice.pickedDatetime,
    };
    InvoiceData[idx] = newInvoice;
    return newInvoice;
  },
  invoiceLine: (invoiceLine: UpdateInboundShipmentLineInput): InvoiceLine => {
    const idx = InvoiceLineData.findIndex(getFilter(invoiceLine.id, 'id'));
    if (idx < 0) throw new Error('Invalid invoice line id');

    const expiryDate = invoiceLine?.expiryDate
      ? parse(invoiceLine.expiryDate, 'dd-MM-yyyy', new Date()).toISOString()
      : '';

    const newLine = {
      ...InvoiceLineData[idx],
      ...invoiceLine,
      expiryDate,
    } as InvoiceLine;
    InvoiceLineData[idx] = newLine;
    return newLine;
  },
  stockLine: (stockLine: StockLine): StockLine => {
    const idx = StockLineData.findIndex(getFilter(stockLine.id, 'id'));
    if (idx < 0) throw new Error('Invalid stock line id');
    const newLine: StockLine = { ...StockLineData[idx], ...stockLine };
    StockLineData[idx] = newLine;
    return newLine;
  },
};

export const insert = {
  invoice: (invoice: Invoice): Invoice => {
    InvoiceData.push(invoice);

    return invoice;
  },
  inboundLine: (invoiceLine: InsertInboundShipmentLineInput): InvoiceLine => {
    const item = db.get.byId.item(invoiceLine.itemId);
    const location = db.location.get.byId(invoiceLine.locationId ?? '');

    const newInvoiceLine: InvoiceLine = {
      ...invoiceLine,
      itemName: item.name,
      itemCode: item.code,
      itemUnit: item.unitName ?? '',
      itemId: item.id,
      expiryDate: invoiceLine?.expiryDate
        ? parse(invoiceLine.expiryDate, 'dd-MM-yyyy', new Date()).toISOString()
        : '',
      type: InvoiceLineNodeType.StockIn,
      batch: '',
      locationId: location?.id ?? '',
      locationName: location?.name ?? '',
      stockLineId: '',
      packSize: invoiceLine.packSize ?? 1,
      costPricePerPack: invoiceLine?.costPricePerPack ?? 0,
      sellPricePerPack: invoiceLine?.sellPricePerPack ?? 0,
    };

    InvoiceLineData.push(newInvoiceLine);

    return newInvoiceLine;
  },
  invoiceLine: (invoiceLine: InsertOutboundShipmentLineInput): InvoiceLine => {
    const item = db.get.byId.item(invoiceLine.itemId);
    const stockLine = invoiceLine?.stockLineId
      ? db.get.byId.stockLine(invoiceLine?.stockLineId)
      : null;

    const newInvoiceLine: InvoiceLine = {
      ...invoiceLine,
      type: InvoiceLineNodeType.StockOut,
      itemName: item.name,
      itemCode: item.code,
      itemUnit: item.unitName ?? '',
      itemId: item.id,
      expiryDate: stockLine?.expiryDate ?? '',
      batch: '',
      locationId: '',
      stockLineId: stockLine?.id ?? '',
      packSize: stockLine?.packSize ?? 1,
      costPricePerPack: stockLine?.costPricePerPack ?? 0,
      sellPricePerPack: stockLine?.sellPricePerPack ?? 0,
    };

    InvoiceLineData.push(newInvoiceLine);

    return newInvoiceLine;
  },
};

export const remove = {
  invoice: (invoiceId: string): string => {
    const idx = get.id.invoice(invoiceId);

    if (idx < 0) {
      throw new Error(`Cannot find invoice to delete with id: ${invoiceId}`);
    }

    removeElement(InvoiceData, idx);

    return invoiceId;
  },
  invoiceLine: (invoiceLineId: string): string => {
    const idx = get.id.invoiceLine(invoiceLineId);

    if (idx < 0) {
      throw new Error(
        `Cannot find invoice line to delete with id: ${invoiceLineId}`
      );
    }

    removeElement(InvoiceLineData, idx);

    return invoiceLineId;
  },
};

export const db = {
  invoice,
  requisition,
  requisitionLine,
  item,
  stockLine,
  get,
  update,
  insert,
  remove,
  stocktake,
  stocktakeLine,
  location,
};
