import { graphql } from 'msw';
import { Invoice as InvoiceSchema } from './../schema/Invoice';
import { Requisition as RequisitionSchema } from './../schema/Requisition';

import { Invoice } from './../data/types';
import { MutationService } from './../api/mutations';
import { ResolverService } from './../api/resolvers';
import {
  InsertSupplierRequisitionInput,
  InvoiceNodeStatus,
  UpdateOutboundShipmentInput,
  InvoiceNodeType,
  InvoicesQueryVariables,
  ItemsListViewQueryVariables,
  NamesQueryVariables,
  DeleteInboundShipmentInput,
  RequisitionListParameters,
  DeleteSupplierRequisitionInput,
  UpdateSupplierRequisitionInput,
} from '@openmsupply-client/common/src/types/schema';

const updateOutboundInvoice = graphql.mutation<
  Record<string, unknown>,
  { input: UpdateOutboundShipmentInput }
>('updateOutboundShipment', (request, response, context) => {
  const { variables } = request;

  const result = MutationService.invoice.outbound.update(variables.input);
  return response(context.data({ updateOutboundShipment: result }));
});

const updateInboundInvoice = graphql.mutation<
  Record<string, unknown>,
  { input: UpdateOutboundShipmentInput }
>('updateInboundShipment', (request, response, context) => {
  const { variables } = request;

  const result = MutationService.invoice.inbound.update(variables.input);
  return response(context.data({ updateInboundShipment: result }));
});

const insertOutboundInvoice = graphql.mutation(
  'insertOutboundShipment',
  (request, response, context) => {
    const { variables } = request;
    const { id, otherPartyId } = variables;

    const result = MutationService.invoice.outbound.insert({
      id,
      otherPartyId,
    } as unknown as Invoice);

    return response(context.data({ insertOutboundShipment: result }));
  }
);

const insertInboundInvoice = graphql.mutation(
  'insertInboundShipment',
  (request, response, context) => {
    const { variables } = request;
    const { id = '', otherPartyId = '' } = variables;

    const result = MutationService.invoice.inbound.insert({
      id,
      otherPartyId,
      status: InvoiceNodeStatus.Draft,
    });

    return response(context.data({ insertInboundShipment: result }));
  }
);

const deleteInboundShipments = graphql.mutation<
  Record<string, any>,
  { ids: DeleteInboundShipmentInput[] }
>('deleteInboundShipments', (request, response, context) => {
  const { variables } = request;
  const { ids } = variables;

  const queryResponse = InvoiceSchema.MutationResolvers.batchInboundShipment(
    null,
    { deleteInboundShipments: ids }
  );

  return response(context.data({ batchInboundShipment: queryResponse }));
});

const deleteOutboundShipments = graphql.mutation<
  Record<string, any>,
  { ids: string[] }
>('deleteOutboundShipments', (request, response, context) => {
  const { variables } = request;
  const { ids } = variables;

  const queryResponse = InvoiceSchema.MutationResolvers.batchOutboundShipment(
    null,
    { deleteOutboundShipments: ids }
  );

  return response(context.data({ batchOutboundShipment: queryResponse }));
});

export const namesList = graphql.query<
  Record<string, unknown>,
  NamesQueryVariables
>('names', (request, response, context) => {
  const { variables } = request;

  const result = ResolverService.name.list(variables);

  return response(context.data({ names: result }));
});

export const invoiceList = graphql.query<
  Record<string, any>,
  InvoicesQueryVariables
>('invoices', (request, response, context) => {
  const { variables } = request;

  const result = ResolverService.invoice.list(variables);

  return response(context.data({ invoices: result }));
});

export const requisitionList = graphql.query<
  Record<string, any>,
  RequisitionListParameters
>('requisitions', (request, response, context) => {
  const { variables } = request;

  const result = ResolverService.requisition.get.list(variables);

  return response(context.data({ requisitions: result }));
});

const insertSupplierRequisition = graphql.mutation<
  Record<string, unknown>,
  { input: InsertSupplierRequisitionInput }
>('insertSupplierRequisition', (request, response, context) => {
  const { variables } = request;

  const result = MutationService.requisition.supplier.insert(variables.input);

  return response(context.data({ insertSupplierRequisition: result }));
});

const deleteSupplierRequisitions = graphql.mutation<
  Record<string, any>,
  { ids: DeleteSupplierRequisitionInput[] }
>('deleteSupplierRequisitions', (request, response, context) => {
  const { variables } = request;
  const { ids } = variables;

  const queryResponse =
    RequisitionSchema.MutationResolvers.batchSupplierRequisition(null, {
      deleteSupplierRequisitions: ids,
    });

  return response(context.data({ batchInboundShipment: queryResponse }));
});

const updateSupplierRequisition = graphql.mutation<
  Record<string, unknown>,
  { input: UpdateSupplierRequisitionInput }
>(
  'updateSupplierRequisition',

  (request, response, context) => {
    const { variables } = request;

    const result = MutationService.requisition.supplier.update(variables.input);

    return response(context.data({ updateSupplierRequisition: result }));
  }
);

export const invoiceDetail = graphql.query(
  'invoice',
  (request, response, context) => {
    const { variables } = request;
    const { id } = variables;

    const invoice = ResolverService.invoice.byId(id as string);

    return response(context.data({ invoice }));
  }
);

export const invoiceDetailByInvoiceNumber = graphql.query(
  'invoiceByInvoiceNumber',
  (request, response, context) => {
    const { variables } = request;
    const { invoiceNumber } = variables;

    const invoice = ResolverService.invoice.byInvoiceNumber(
      invoiceNumber as number
    );

    return response(context.data({ invoiceByInvoiceNumber: invoice }));
  }
);

export const itemsWithStockLines = graphql.query<
  Record<string, unknown>,
  ItemsListViewQueryVariables
>('itemsWithStockLines', (request, response, context) => {
  const { variables } = request;
  const result = ResolverService.item.list(variables);

  return response(context.data({ items: result }));
});

export const itemsListView = graphql.query<
  Record<string, unknown>,
  ItemsListViewQueryVariables
>('itemsListView', (request, response, context) => {
  const { variables } = request;
  const result = ResolverService.item.list(variables);

  return response(context.data({ items: result }));
});

export const permissionError = graphql.query(
  'error401',
  (_, response, context) =>
    response(
      context.status(401),
      context.data({ data: [{ id: 0, message: 'Permission Denied' }] })
    )
);

export const serverError = graphql.query('error500', (_, response, context) =>
  response(
    context.status(500),
    context.data({
      data: [{ id: 0, message: 'Server Error' }],
    })
  )
);

export const invoiceCounts = graphql.query<
  Record<string, unknown>,
  { type: InvoiceNodeType }
>('invoiceCounts', (request, response, context) => {
  const { variables } = request;
  const { type } = variables;
  const invoiceCounts = ResolverService.statistics.invoice(type);

  return response(context.data({ invoiceCounts }));
});

export const stockCounts = graphql.query(
  'stockCounts',
  (_, response, context) => {
    const stockCounts = ResolverService.statistics.stock();

    return response(context.data({ stockCounts }));
  }
);

export const upsertOutboundShipment = graphql.mutation(
  'upsertOutboundShipment',
  (request, response, context) => {
    const { variables } = request;

    const queryResponse = InvoiceSchema.MutationResolvers.batchOutboundShipment(
      null,
      variables
    );

    return response(context.data({ batchOutboundShipment: queryResponse }));
  }
);

export const upsertInboundShipment = graphql.mutation(
  'upsertInboundShipment',
  (request, response, context) => {
    const { variables } = request;
    const queryResponse = InvoiceSchema.MutationResolvers.batchInboundShipment(
      null,
      variables
    );
    return response(context.data({ batchInboundShipment: queryResponse }));
  }
);

export const handlers = [
  invoiceList,
  invoiceDetail,
  invoiceDetailByInvoiceNumber,
  updateOutboundInvoice,
  updateInboundInvoice,
  deleteOutboundShipments,
  permissionError,
  serverError,
  insertOutboundInvoice,
  insertInboundInvoice,
  deleteInboundShipments,
  namesList,
  itemsListView,
  itemsWithStockLines,
  upsertOutboundShipment,
  upsertInboundShipment,
  invoiceCounts,
  stockCounts,
  requisitionList,
  insertSupplierRequisition,
  updateSupplierRequisition,
  deleteSupplierRequisitions,
];
