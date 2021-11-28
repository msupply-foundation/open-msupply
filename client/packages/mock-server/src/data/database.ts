import faker from 'faker';
import {
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
  InsertCustomerRequisitionLineInput,
  UpdateCustomerRequisitionLineInput,
  DeleteCustomerRequisitionLineInput,
  UpdateOutboundShipmentInput,
  InsertOutboundShipmentLineInput,
  UpdateOutboundShipmentLineInput,
  InsertInboundShipmentLineInput,
  SupplierRequisitionNodeStatus,
  RequisitionNodeType,
} from './../../../common/src/types/schema';
import {
  Item,
  StockLine,
  Invoice,
  InvoiceLine,
  Name,
  Requisition,
  RequisitionLine,
  Stocktake,
} from './types';
import {
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
            isToday(new Date(invoice.entryDatetime))
        ).length,
        thisWeek: InvoiceData.filter(
          invoice =>
            invoice.type === 'INBOUND_SHIPMENT' &&
            isThisWeek(new Date(invoice.entryDatetime))
        ).length,
      },
    },
    outboundShipment: {
      toBePicked: InvoiceData.filter(invoice => invoice.status === 'CONFIRMED')
        .length,
    },
    stock: {
      expired: StockLineData.filter(stockLine =>
        isExpired(new Date(stockLine.expiryDate))
      ).length,
      expiringSoon: StockLineData.filter(stockLine =>
        isAlmostExpired(new Date(stockLine.expiryDate))
      ).length,
    },
  },
};

export const update = {
  invoice: (
    invoice: UpdateOutboundShipmentInput & {
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
      // color: invoice?.color ?? existingInvoice.color,
      comment: invoice?.comment ?? existingInvoice.comment,
      theirReference: invoice?.theirReference ?? existingInvoice.theirReference,
      onHold: invoice?.onHold ?? existingInvoice.onHold,
      status: invoice?.status ?? existingInvoice.status,
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
  invoiceLine: (invoiceLine: UpdateOutboundShipmentLineInput): InvoiceLine => {
    const idx = InvoiceLineData.findIndex(getFilter(invoiceLine.id, 'id'));
    if (idx < 0) throw new Error('Invalid invoice line id');
    const newLine = { ...InvoiceLineData[idx], ...invoiceLine } as InvoiceLine;
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

    const newInvoiceLine: InvoiceLine = {
      ...invoiceLine,
      itemName: item.name,
      itemCode: item.code,
      itemUnit: item.unitName ?? '',
      itemId: item.id,
      expiryDate: invoiceLine?.expiryDate ?? null,
      batch: '',
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
      itemName: item.name,
      itemCode: item.code,
      itemUnit: item.unitName ?? '',
      itemId: item.id,
      expiryDate: stockLine?.expiryDate ?? '',
      batch: '',
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
};
