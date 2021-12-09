import { ResolverService } from './../resolvers/index';
import { ResolvedInvoiceLine } from './../../data/types';
import { db } from './../../data/database';
import {
  adjustStockLineAvailableNumberOfPacks,
  adjustStockLineTotalNumberOfPacks,
} from './../../data/data';
import {
  InsertInboundShipmentLineInput,
  UpdateInboundShipmentLineInput,
  DeleteInboundShipmentLineInput,
  InsertOutboundShipmentLineInput,
  UpdateOutboundShipmentLineInput,
  DeleteOutboundShipmentLineInput,
  InvoiceNodeType,
  InvoiceNodeStatus,
  DeleteResponse,
} from '@openmsupply-client/common/src/types';

export const InvoiceLineMutation = {
  outbound: {
    insert: (
      invoiceLine: InsertOutboundShipmentLineInput
    ): ResolvedInvoiceLine => {
      const invoice = db.get.byId.invoice(invoiceLine.invoiceId);
      const existing = db.get.byId.invoiceLine(invoiceLine.id);

      if (existing.id) {
        throw new Error(
          `InvoiceLine with the ID ${invoiceLine.id} already exists!`
        );
      }

      if (
        invoice.type === InvoiceNodeType.InboundShipment &&
        invoice.status !== InvoiceNodeStatus.New
      ) {
        adjustStockLineAvailableNumberOfPacks(
          invoiceLine.stockLineId,
          invoiceLine.numberOfPacks
        );
        adjustStockLineTotalNumberOfPacks(
          invoiceLine.stockLineId,
          invoiceLine.numberOfPacks
        );
      }

      const insertedLine = db.insert.invoiceLine(invoiceLine);

      return ResolverService.invoiceLine.byId(insertedLine.id);
    },
    update: (
      invoiceLine: UpdateOutboundShipmentLineInput
    ): ResolvedInvoiceLine => {
      const invoice = db.get.byId.invoice(invoiceLine.invoiceId);

      const currentInvoiceLine = ResolverService.invoiceLine.byId(
        invoiceLine.id
      );
      const { numberOfPacks } = currentInvoiceLine;
      const difference = numberOfPacks - (invoiceLine?.numberOfPacks ?? 0);

      if (currentInvoiceLine.stockLineId) {
        adjustStockLineAvailableNumberOfPacks(
          currentInvoiceLine.stockLineId,
          difference
        );

        if (invoice.status !== InvoiceNodeStatus.New) {
          adjustStockLineTotalNumberOfPacks(
            currentInvoiceLine.stockLineId,
            difference
          );
        }
      }

      return currentInvoiceLine;
    },
    remove: (input: DeleteOutboundShipmentLineInput): DeleteResponse => {
      const invoiceLine = ResolverService.invoiceLine.byId(input.id);
      const invoice = db.get.byId.invoice(invoiceLine.invoiceId);
      const { numberOfPacks } = invoiceLine;

      if (invoiceLine.stockLineId) {
        adjustStockLineAvailableNumberOfPacks(
          invoiceLine.stockLineId,
          numberOfPacks
        );

        if (invoice.status !== InvoiceNodeStatus.New) {
          adjustStockLineTotalNumberOfPacks(
            invoiceLine.stockLineId,
            numberOfPacks
          );
        }
      }

      return { id: db.remove.invoiceLine(input.id) };
    },
  },
  inbound: {
    insert: (
      inboundLine: InsertInboundShipmentLineInput
    ): ResolvedInvoiceLine => {
      const existing = db.get.byId.invoiceLine(inboundLine.id);

      if (existing.id) {
        throw new Error(
          `InvoiceLine with the ID ${inboundLine.id} already exists!`
        );
      }

      const insertedLine = db.insert.inboundLine(inboundLine);
      const invoice = db.get.byId.invoice(inboundLine.invoiceId);

      if (
        insertedLine.stockLineId &&
        invoice.status !== InvoiceNodeStatus.New
      ) {
        adjustStockLineAvailableNumberOfPacks(
          insertedLine.stockLineId,
          insertedLine.numberOfPacks
        );
        adjustStockLineTotalNumberOfPacks(
          insertedLine.stockLineId,
          insertedLine.numberOfPacks
        );
      }

      return ResolverService.invoiceLine.byId(insertedLine.id);
    },
    update: (
      invoiceLine: UpdateInboundShipmentLineInput
    ): ResolvedInvoiceLine => {
      const invoice = db.get.byId.invoice(invoiceLine.invoiceId);

      const currentInvoiceLine = ResolverService.invoiceLine.byId(
        invoiceLine.id
      );
      const { numberOfPacks } = currentInvoiceLine;
      const difference = numberOfPacks - (invoiceLine?.numberOfPacks ?? 0);

      if (currentInvoiceLine.stockLineId) {
        if (invoice.status !== InvoiceNodeStatus.New) {
          adjustStockLineAvailableNumberOfPacks(
            currentInvoiceLine.stockLineId,
            -difference
          );
          adjustStockLineTotalNumberOfPacks(
            currentInvoiceLine.stockLineId,
            -difference
          );
        }
      }

      return currentInvoiceLine;
    },
    remove: (input: DeleteInboundShipmentLineInput): DeleteResponse => {
      const invoiceLine = ResolverService.invoiceLine.byId(input.id);
      const invoice = db.get.byId.invoice(invoiceLine.invoiceId);
      const { numberOfPacks } = invoiceLine;

      if (invoiceLine.stockLineId) {
        if (invoice.status !== InvoiceNodeStatus.New) {
          adjustStockLineAvailableNumberOfPacks(
            invoiceLine.stockLineId,
            -numberOfPacks
          );
          adjustStockLineTotalNumberOfPacks(
            invoiceLine.stockLineId,
            -numberOfPacks
          );
        }
      }

      return { id: db.remove.invoiceLine(input.id) };
    },
  },
};
