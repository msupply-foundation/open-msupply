import { InvoiceListParameters } from './../data/types';
import { MutationService } from './../api/mutations';
import {
  UpdateOutboundShipmentInput,
  UpdateInboundShipmentInput,
  BatchInboundShipmentInput,
  InvoiceResponse,
  InvoicesResponse,
} from './../../../common/src/types/schema';
import { BatchOutboundShipmentInput } from '@openmsupply-client/common/src/types/schema';
import { Api } from '../api';

import { Invoice as InvoiceType } from '../data/types';

const QueryResolvers = {
  invoices: (_: unknown, vars: InvoiceListParameters): InvoicesResponse => {
    return Api.ResolverService.invoice.list(vars);
  },

  invoice: (_: unknown, { id }: { id: string }): InvoiceResponse => {
    return Api.ResolverService.invoice.byId(id);
  },
};

const MutationResolvers = {
  updateOutboundShipment: (
    _: unknown,
    { input }: { input: UpdateOutboundShipmentInput }
  ): InvoiceType => {
    return Api.MutationService.update.invoice(input);
  },
  updateInboundShipment: (
    _: unknown,
    { input }: { input: UpdateInboundShipmentInput }
  ): InvoiceType => {
    return Api.MutationService.update.invoice(input);
  },
  insertOutboundShipment: (
    _: unknown,
    { input }: { input: InvoiceType }
  ): InvoiceType => {
    return Api.MutationService.insert.invoice(input);
  },
  deleteOutboundShipment: (_: unknown, id: string): string => {
    return Api.MutationService.remove.invoice(id);
  },
  deleteInboundShipment: (_: unknown, input: { id: string }): string => {
    return MutationService.remove.invoice(input.id);
  },
  batchOutboundShipment: (_: unknown, vars: BatchOutboundShipmentInput) => {
    const response = {
      __typename: 'BatchOutboundShipmentResponse',
      deleteOutboundShipments: [] as { id: string }[],
      insertOutboundShipmentLines: [] as { id: string }[],
      updateOutboundShipments: [] as { id: string }[],
      deleteOutboundShipmentLines: [] as { id: string }[],
      updateOutboundShipmentLines: [] as { id: string }[],
    };

    if (vars.deleteOutboundShipments) {
      response.deleteOutboundShipments = vars.deleteOutboundShipments.map(
        id => ({
          id: MutationResolvers.deleteOutboundShipment(null, id),
        })
      );
    }

    if (vars.updateOutboundShipments) {
      response.updateOutboundShipments = [
        Api.MutationService.update.invoice(
          vars.updateOutboundShipments[0] as UpdateOutboundShipmentInput
        ),
      ];
    }

    if (vars.insertOutboundShipmentLines) {
      response.insertOutboundShipmentLines =
        vars.insertOutboundShipmentLines.map(line => {
          return MutationService.insert.invoiceLine(line);
        });
    }

    if (vars.deleteOutboundShipmentLines) {
      response.deleteOutboundShipmentLines =
        vars.deleteOutboundShipmentLines.map(line => ({
          id: MutationService.remove.invoiceLine(line.id),
        }));
    }

    if (vars.updateOutboundShipmentLines) {
      response.updateOutboundShipmentLines =
        vars.updateOutboundShipmentLines.map(line => ({
          id: MutationService.update.invoiceLine(line).id,
        }));
    }

    return response;
  },
  batchInboundShipment: (_: unknown, vars: BatchInboundShipmentInput) => {
    const response = {
      __typename: 'BatchInboundShipmentResponse',
      deleteInboundShipments: [] as { id: string }[],
      insertInboundShipmentLines: [] as { id: string }[],
      updateInboundShipments: [] as { id: string }[],
      deleteInboundShipmentLines: [] as { id: string }[],
      updateInboundShipmentLines: [] as { id: string }[],
    };

    if (vars.deleteInboundShipments) {
      response.deleteInboundShipments = vars.deleteInboundShipments.map(id => ({
        id: MutationResolvers.deleteInboundShipment(null, { id }),
      }));
    }

    if (vars.updateInboundShipments) {
      response.updateInboundShipments = [
        Api.MutationService.update.invoice(
          vars.updateInboundShipments[0] as UpdateInboundShipmentInput
        ),
      ];
    }

    if (vars.insertInboundShipmentLines) {
      response.insertInboundShipmentLines = vars.insertInboundShipmentLines.map(
        line => {
          return MutationService.insert.inboundInvoiceLine(line);
        }
      );
    }

    if (vars.deleteInboundShipmentLines) {
      response.deleteInboundShipmentLines = vars.deleteInboundShipmentLines.map(
        line => ({
          id: MutationService.remove.invoiceLine(line.id),
        })
      );
    }

    if (vars.updateInboundShipmentLines) {
      response.updateInboundShipmentLines = vars.updateInboundShipmentLines.map(
        line => ({
          id: MutationService.update.invoiceLine(line).id,
        })
      );
    }

    return response;
  },
};

export const Invoice = {
  QueryResolvers,
  MutationResolvers,
};
