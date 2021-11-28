import { InvoiceListParameters } from './../data/types';
import { MutationService } from './../api/mutations';
import {
  UpdateInboundShipmentInput,
  DeleteInboundShipmentInput,
  InsertOutboundShipmentInput,
  UpdateOutboundShipmentInput,
  BatchInboundShipmentInput,
  BatchOutboundShipmentInput,
  InvoiceResponse,
  InvoicesResponse,
  DeleteOutboundShipmentResponse,
  DeleteInboundShipmentResponse,
  BatchOutboundShipmentResponse,
  BatchInboundShipmentResponse,
  InsertInboundShipmentInput,
} from './../../../common/src/types/schema';
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
    return Api.MutationService.invoice.outbound.update(input);
  },
  updateInboundShipment: (
    _: unknown,
    { input }: { input: UpdateInboundShipmentInput }
  ): InvoiceType => {
    return Api.MutationService.invoice.inbound.update(input);
  },
  insertOutboundShipment: (
    _: unknown,
    { input }: { input: InsertOutboundShipmentInput }
  ): InsertOutboundShipmentInput => {
    return Api.MutationService.invoice.outbound.insert(input);
  },
  insertInboundShipment: (
    _: unknown,
    { input }: { input: InsertInboundShipmentInput }
  ): InsertOutboundShipmentInput => {
    return Api.MutationService.invoice.inbound.insert(input);
  },
  deleteOutboundShipment: (
    _: unknown,
    id: string
  ): DeleteOutboundShipmentResponse => {
    return Api.MutationService.invoice.outbound.remove(id);
  },
  deleteInboundShipment: (
    _: unknown,
    { input }: { input: DeleteInboundShipmentInput }
  ): DeleteInboundShipmentResponse => {
    return MutationService.invoice.inbound.remove(input);
  },
  batchOutboundShipment: (
    _: unknown,
    vars: BatchOutboundShipmentInput
  ): BatchOutboundShipmentResponse => {
    const batchResponse: BatchOutboundShipmentResponse = {
      __typename: 'BatchOutboundShipmentResponse',
      deleteOutboundShipments: [],
      insertOutboundShipmentLines: [],
      updateOutboundShipments: [],
      deleteOutboundShipmentLines: [],
      updateOutboundShipmentLines: [],
    };

    if (vars.updateOutboundShipments) {
      batchResponse.updateOutboundShipments = vars.updateOutboundShipments.map(
        vars => {
          const response = MutationService.invoice.outbound.update(vars);
          return {
            __typename: 'UpdateOutboundShipmentResponseWithId',
            id: response.id,
            response,
          };
        }
      );
    }

    if (vars.deleteOutboundShipments) {
      batchResponse.deleteOutboundShipments = vars.deleteOutboundShipments.map(
        vars => {
          const response = MutationService.invoice.outbound.remove(vars);
          return {
            __typename: 'DeleteOutboundShipmentResponseWithId',
            id: response.id,
            response,
          };
        }
      );
    }

    if (vars.insertOutboundShipmentLines) {
      batchResponse.insertOutboundShipmentLines =
        vars.insertOutboundShipmentLines.map(vars => {
          const response = MutationService.invoiceLine.outbound.insert(vars);
          return {
            __typename: 'InsertOutboundShipmentLineResponseWithId',
            id: response.id,
            response,
          };
        });
    }

    if (vars.deleteOutboundShipmentLines) {
      batchResponse.deleteOutboundShipmentLines =
        vars.deleteOutboundShipmentLines.map(vars => {
          const response = MutationService.invoiceLine.outbound.remove(vars);
          return {
            __typename: 'DeleteOutboundShipmentLineResponseWithId',
            id: response.id,
            response,
          };
        });
    }

    if (vars.updateOutboundShipmentLines) {
      batchResponse.updateOutboundShipmentLines =
        vars.updateOutboundShipmentLines.map(vars => {
          const response = MutationService.invoiceLine.outbound.update(vars);
          return {
            __typename: 'UpdateOutboundShipmentLineResponseWithId',
            id: response.id,
            response,
          };
        });
    }

    return batchResponse;
  },
  batchInboundShipment: (
    _: unknown,
    vars: BatchInboundShipmentInput
  ): BatchInboundShipmentResponse => {
    const batchResponse: BatchInboundShipmentResponse = {
      __typename: 'BatchInboundShipmentResponse',
      deleteInboundShipments: [],
      insertInboundShipmentLines: [],
      updateInboundShipments: [],
      deleteInboundShipmentLines: [],
      updateInboundShipmentLines: [],
    };

    if (vars.deleteInboundShipments) {
      batchResponse.deleteInboundShipments = vars.deleteInboundShipments.map(
        vars => {
          const response = MutationService.invoice.inbound.remove(vars);
          return {
            __typename: 'DeleteInboundShipmentResponseWithId',
            id: response.id,
            response,
          };
        }
      );
    }

    if (vars.updateInboundShipments) {
      batchResponse.updateInboundShipments = vars.updateInboundShipments.map(
        vars => {
          const response = MutationService.invoice.inbound.update(vars);
          return {
            __typename: 'UpdateInboundShipmentResponseWithId',
            id: response.id,
            response,
          };
        }
      );
    }

    if (vars.insertInboundShipmentLines) {
      batchResponse.insertInboundShipmentLines =
        vars.insertInboundShipmentLines.map(vars => {
          const response = MutationService.invoiceLine.inbound.insert(vars);
          return {
            __typename: 'InsertInboundShipmentLineResponseWithId',
            id: response.id,
            response,
          };
        });
    }

    if (vars.deleteInboundShipmentLines) {
      batchResponse.deleteInboundShipmentLines =
        vars.deleteInboundShipmentLines.map(vars => {
          const response = MutationService.invoiceLine.inbound.remove(vars);
          return {
            __typename: 'DeleteInboundShipmentLineResponseWithId',
            id: response.id,
            response,
          };
        });
    }

    if (vars.updateInboundShipmentLines) {
      batchResponse.updateInboundShipmentLines =
        vars.updateInboundShipmentLines.map(vars => {
          const response = MutationService.invoiceLine.inbound.update(vars);
          return {
            __typename: 'UpdateInboundShipmentLineResponseWithId',
            id: response.id,
            response,
          };
        });
    }

    return batchResponse;
  },
};

export const Invoice = {
  QueryResolvers,
  MutationResolvers,
};
