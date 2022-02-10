import { ResolvedInvoice } from './../../data/types';
import { db, createInvoice } from './../../data';
import {
  InsertInboundShipmentInput,
  UpdateInboundShipmentInput,
  DeleteInboundShipmentInput,
  InsertOutboundShipmentInput,
  UpdateOutboundShipmentInput,
  InvoiceNodeType,
  InvoiceNodeStatus,
  DeleteResponse,
} from '@openmsupply-client/common/src/types';
import { ResolverService } from '../resolvers';

const getStatusTime = (status: string | undefined | null) => {
  switch (status) {
    case 'ALLOCATED': {
      return { allocatedDatetime: new Date().toISOString() };
    }
    case 'SHIPPED': {
      return { shippedDatetime: new Date().toISOString() };
    }
    case 'PICKED': {
      return { pickedDatetime: new Date().toISOString() };
    }
  }

  return {};
};

export const InvoiceMutation = {
  outbound: {
    insert: (input: InsertOutboundShipmentInput): ResolvedInvoice => {
      const existing = db.get.byId.invoice(input.id);
      if (existing.id) {
        throw new Error(`invoice with the ID ${input.id} already exists!`);
      }

      const allInvoices = db.get.all.invoice();
      const invoiceNumber =
        allInvoices.reduce(
          (acc, invoice) => Math.max(Number(invoice.invoiceNumber), acc),
          0
        ) + 1;

      const otherPartyName = db.get.byId.name(input.otherPartyId);
      db.insert.invoice(
        createInvoice(
          input.id,
          invoiceNumber,
          otherPartyName,
          InvoiceNodeType.OutboundShipment,
          {
            status: InvoiceNodeStatus.New,
            allocatedDatetime: null,
            pickedDatetime: null,
            shippedDatetime: null,
            deliveredDatetime: null,
            verifiedDatetime: null,
            comment: null,
          }
        )
      );

      return ResolverService.invoice.byId(input.id);
    },
    update: (invoice: UpdateOutboundShipmentInput): ResolvedInvoice => {
      const updated = db.update.invoice({
        ...invoice,
        ...getStatusTime(invoice.status),
      });

      const resolvedInvoice = ResolverService.invoice.byId(updated.id);

      return resolvedInvoice;
    },
    remove: (invoiceId: string): DeleteResponse => {
      const resolvedInvoice = ResolverService.invoice.byId(String(invoiceId));

      if (
        resolvedInvoice.status !== InvoiceNodeStatus.Allocated &&
        resolvedInvoice.status !== InvoiceNodeStatus.New
      ) {
        throw new Error('Only allocated or new shipments can be deleted');
      }

      resolvedInvoice.lines.nodes.forEach(line => {
        db.remove.invoiceLine(line.id);
      });

      return { id: db.remove.invoice(invoiceId) };
    },
  },
  inbound: {
    insert: (input: InsertInboundShipmentInput): ResolvedInvoice => {
      const existing = db.get.byId.invoice(input.id);
      if (existing.id) {
        throw new Error(`invoice with the ID ${input.id} already exists!`);
      }

      const allInvoices = db.get.all.invoice();
      const invoiceNumber =
        allInvoices.reduce(
          (acc, invoice) => Math.max(Number(invoice.invoiceNumber), acc),
          0
        ) + 1;

      const otherPartyName = db.get.byId.name(input.otherPartyId);
      db.insert.invoice(
        createInvoice(
          input.id,
          invoiceNumber,
          otherPartyName,
          InvoiceNodeType.InboundShipment
        )
      );

      return ResolverService.invoice.byId(input.id);
    },
    update: (invoice: UpdateInboundShipmentInput): ResolvedInvoice => {
      const updated = db.update.invoice({
        ...invoice,
        ...getStatusTime(invoice.status),
      });
      const resolvedInvoice = ResolverService.invoice.byId(updated.id);

      return resolvedInvoice;
    },
    remove: (input: DeleteInboundShipmentInput): DeleteResponse => {
      const resolvedInvoice = ResolverService.invoice.byId(input.id);

      if (resolvedInvoice.status !== InvoiceNodeStatus.New) {
        throw new Error("Can't delete non new shipment");
      }

      resolvedInvoice.lines.nodes.forEach(line => {
        db.remove.invoiceLine(line.id);
      });

      return { id: db.remove.invoice(input.id) };
    },
  },
};
