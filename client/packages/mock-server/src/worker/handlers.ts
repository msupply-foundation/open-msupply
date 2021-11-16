import { graphql } from 'msw';
import { Invoice as InvoiceSchema } from './../schema/Invoice';
import { Invoice, InvoiceLine } from './../data/types';
import { MutationService } from './../api/mutations';
import { ResolverService } from './../api/resolvers';
import {
  UpdateOutboundShipmentInput,
  InvoiceNodeType,
  InvoicesQueryVariables,
  ItemsListViewQueryVariables,
  NamesQueryVariables,
  UpdateOutboundShipmentLineInput,
} from '@openmsupply-client/common';

const updateInvoice = graphql.mutation<
  Record<string, unknown>,
  { input: UpdateOutboundShipmentInput }
>('updateOutboundShipment', (request, response, context) => {
  const { variables } = request;

  const result = MutationService.update.invoice(variables.input);
  return response(context.data({ updateOutboundShipment: result }));
});

const insertInvoice = graphql.mutation(
  'insertOutboundShipment',
  (request, response, context) => {
    const { variables } = request;
    const { id, otherPartyId } = variables;

    const result = MutationService.insert.invoice({
      id,
      otherPartyId,
    } as unknown as Invoice);

    return response(context.data({ insertOutboundShipment: result }));
  }
);

const deleteOutboundShipments = graphql.mutation<
  Record<string, any>,
  { ids: string[] }
>('deleteOutboundShipments', (request, response, context) => {
  const { variables } = request;
  const { ids } = variables;

  const queryResponse = {
    __typename: 'BatchOutboundShipmentResponse',
    deleteOutboundShipments: [] as { id: string }[],
  };

  queryResponse.deleteOutboundShipments = ids.map(id => ({
    id: InvoiceSchema.MutationResolvers.deleteOutboundShipment(null, id),
  }));

  return response(context.data({ batchOutboundShipment: queryResponse }));
});

export const namesList = graphql.query<
  Record<string, unknown>,
  NamesQueryVariables
>('names', (request, response, context) => {
  const { variables } = request;

  const result = ResolverService.list.name(variables);

  return response(context.data({ names: result }));
});

export const invoiceList = graphql.query<
  Record<string, any>,
  InvoicesQueryVariables
>('invoices', (request, response, context) => {
  const { variables } = request;

  const result = ResolverService.list.invoice(variables);

  return response(context.data({ invoices: result }));
});

export const invoiceDetail = graphql.query(
  'invoice',
  (request, response, context) => {
    const { variables } = request;
    const { id } = variables;

    const invoice = ResolverService.byId.invoice(id as string);

    return response(context.data({ invoice }));
  }
);

export const invoiceDetailByInvoiceNumber = graphql.query(
  'invoiceByInvoiceNumber',
  (request, response, context) => {
    const { variables } = request;
    const { invoiceNumber } = variables;

    const invoice = ResolverService.invoice.get.byInvoiceNumber(
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
  const result = ResolverService.list.item(variables);

  return response(context.data({ items: result }));
});

export const itemsListView = graphql.query<
  Record<string, unknown>,
  ItemsListViewQueryVariables
>('itemsListView', (request, response, context) => {
  const { variables } = request;
  const result = ResolverService.list.item(variables);

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
    const {
      insertOutboundShipmentLines,
      updateOutboundShipments,
      deleteOutboundShipmentLines,
      updateOutboundShipmentLines,
    } = variables;

    const queryResponse = {
      __typename: 'BatchOutboundShipmentResponse',
      insertOutboundShipmentLines: [] as { id: string }[],
      updateOutboundShipments: [] as { id: string; __typename: string }[],
      deleteOutboundShipmentLines: [] as { id: string; __typename: string }[],
      updateOutboundShipmentLines: [] as { id: string; __typename: string }[],
    };

    if (updateOutboundShipments.length > 0) {
      queryResponse.updateOutboundShipments = [
        {
          ...MutationService.update.invoice(updateOutboundShipments[0]),
          __typename: 'UpdateOutboundShipmentResponseWithId',
        },
      ];
    }

    if (insertOutboundShipmentLines.length > 0) {
      queryResponse.insertOutboundShipmentLines =
        insertOutboundShipmentLines.map((line: InvoiceLine) => {
          MutationService.insert.invoiceLine(line);
        });
    }

    if (deleteOutboundShipmentLines.length > 0) {
      queryResponse.deleteOutboundShipmentLines =
        deleteOutboundShipmentLines.map((line: InvoiceLine) => {
          MutationService.remove.invoiceLine(line.id);
        });
    }

    if (updateOutboundShipmentLines.length > 0) {
      queryResponse.deleteOutboundShipmentLines =
        updateOutboundShipmentLines.map(
          (line: UpdateOutboundShipmentLineInput) => {
            MutationService.update.invoiceLine(line);
          }
        );
    }
    return response(context.data({ batchOutboundShipment: queryResponse }));
  }
);

export const handlers = [
  invoiceList,
  invoiceDetail,
  invoiceDetailByInvoiceNumber,
  updateInvoice,
  deleteOutboundShipments,
  permissionError,
  serverError,
  insertInvoice,
  namesList,
  itemsListView,
  itemsWithStockLines,
  upsertOutboundShipment,
  invoiceCounts,
  stockCounts,
];
