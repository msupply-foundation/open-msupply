import { graphql } from 'msw';
import { Api } from '../api';

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

    invoices.forEach(invoice => {
      Api.MutationService.remove.invoice(invoice);
    });

    return response(context.data({ invoices }));
  }
);

export const invoiceList = graphql.query(
  'invoices',
  (request, response, context) => {
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
  }
);

export const invoiceDetail = graphql.query(
  'invoice',
  (request, response, context) => {
    const { variables } = request;
    const { id } = variables;

    const invoice = Api.ResolverService.byId.invoice(id);

    return response(context.data({ invoice }));
  }
);

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
