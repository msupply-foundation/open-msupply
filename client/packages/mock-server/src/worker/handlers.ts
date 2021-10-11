import { PaginationOptions } from './../index';
import { graphql } from 'msw';
import { Api } from '../api';
import { Invoice } from '../data';

const updateInvoice = graphql.mutation(
  'updateInvoice',
  (request, response, context) => {
    const { variables } = request;
    const { invoicePatch } = variables;

    const result = Api.MutationService.update.invoice(invoicePatch);

    return response(context.data({ updateInvoice: result }));
  }
);

const deleteInvoices = graphql.mutation(
  'deleteInvoices',
  (request, response, context) => {
    const { variables } = request;
    const { invoices } = variables;

    (invoices as Invoice[]).forEach(invoice => {
      Api.MutationService.remove.invoice(invoice);
    });

    return response(context.data({ invoices }));
  }
);

export const invoiceList = graphql.query<
  Record<string, unknown>,
  PaginationOptions
>('invoices', (request, response, context) => {
  const {
    variables = {
      first: 50,
      offset: 0,
      sort: 'name',
      desc: false,
    },
  } = request;

  const result = Api.ResolverService.list.invoice(variables);

  return response(context.data({ invoices: result }));
});

export const invoiceDetail = graphql.query(
  'invoice',
  (request, response, context) => {
    const { variables } = request;
    const { id } = variables;

    const invoice = Api.ResolverService.byId.invoice(id as string);

    return response(context.data({ invoice }));
  }
);

export const itemList = graphql.query('items', (_, response, context) => {
  const result = Api.ResolverService.list.item();

  return response(context.data({ invoices: result }));
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

export const handlers = [
  invoiceList,
  invoiceDetail,
  updateInvoice,
  deleteInvoices,
  permissionError,
  serverError,
];
