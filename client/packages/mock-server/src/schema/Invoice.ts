import { MutationService } from './../api/mutations';
import { UpdateOutboundShipmentInput } from './../../../common/src/types/schema';
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
  insertOutboundShipment: (
    _: any,
    { input }: { input: InvoiceType }
  ): InvoiceType => {
    return Api.MutationService.insert.invoice(input);
  },
  deleteOutboundShipment: (_: any, id: string): string => {
    return Api.MutationService.remove.invoice(id);
  },
  batchOutboundShipment: (_: any, vars: BatchOutboundShipmentInput) => {
    const response = {
      __typename: 'BatchOutboundShipmentResponse',
      deleteOutboundShipments: [] as { id: string }[],
      insertOutboundShipmentLines: [] as { id: string }[],
    };

    if (vars.deleteOutboundShipments) {
      response.deleteOutboundShipments = vars.deleteOutboundShipments.map(
        id => ({
          id: MutationResolvers.deleteOutboundShipment(null, id),
        })
      );
    }

    if (vars.insertOutboundShipmentLines) {
      response.insertOutboundShipmentLines =
        vars.insertOutboundShipmentLines.map(line => {
          return MutationService.insert.invoiceLine(line);
        });
    }

    return response;
  },
};

export const Invoice = {
  QueryResolvers,
  MutationResolvers,
};
