import { MutationService } from './../api/mutations';
import {
  UpdateOutboundShipmentInput,
  UpdateInboundShipmentInput,
  BatchInboundShipmentInput,
} from './../../../common/src/types/schema';
import {
  InvoiceSortFieldInput,
  InvoiceFilterInput,
  BatchOutboundShipmentInput,
} from '@openmsupply-client/common/src/types/schema';
import { Api } from '../api';

import { ListResponse, Invoice as InvoiceType } from '../data/types';

const QueryResolvers = {
  invoices: (
    _: any,
    vars: {
      page?: { first?: number; offset?: number };
      sort: [{ key: InvoiceSortFieldInput; desc: boolean }];
      filter?: InvoiceFilterInput;
    }
  ): ListResponse<InvoiceType> => {
    return Api.ResolverService.list.invoice({
      first: vars.page?.first ?? 20,
      offset: vars.page?.offset ?? 0,
      desc: vars.sort[0].desc ?? false,
      key: vars.sort[0].key ?? InvoiceSortFieldInput.Status,
      filter: vars.filter,
    });
  },

  invoice: (_: any, { id }: { id: string }): InvoiceType => {
    return Api.ResolverService.byId.invoice(id);
  },
};

const MutationResolvers = {
  updateOutboundShipment: (
    _: any,
    { input }: { input: UpdateOutboundShipmentInput }
  ): InvoiceType => {
    return Api.MutationService.update.invoice(input);
  },
  updateInboundShipment: (
    _: any,
    { input }: { input: UpdateInboundShipmentInput }
  ): InvoiceType => {
    return Api.MutationService.update.invoice(input);
  },
  insertOutboundShipment: (
    _: any,
    { input }: { input: InvoiceType }
  ): InvoiceType => {
    return Api.MutationService.insert.invoice(input);
  },
  deleteOutboundShipment: (_: any, id: string): string => {
    return Api.MutationService.remove.invoice(id);
  },
  deleteInboundShipment: (_: any, input: { id: string }): string => {
    return MutationService.remove.invoice(input.id);
  },
  batchOutboundShipment: (_: any, vars: BatchOutboundShipmentInput) => {
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
  batchInboundShipment: (_: any, vars: BatchInboundShipmentInput) => {
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
