import { Invoice } from './../data/types';
import { graphql } from 'msw'; // , rest } from 'msw';
import { Api } from '../api';
import {
  InvoiceNodeType,
  InvoicesQueryVariables,
  ItemsListViewQueryVariables,
  NamesQueryVariables,
} from '@openmsupply-client/common';

const updateInvoice = graphql.mutation(
  'updateInvoice',
  (request, response, context) => {
    const { variables } = request;
    const { invoicePatch } = variables;

    const result = Api.MutationService.update.invoice(invoicePatch);

    return response(context.data({ updateInvoice: result }));
  }
);

const insertInvoice = graphql.mutation(
  'insertInvoice',
  (request, response, context) => {
    const { variables } = request;
    const { id, otherPartyId } = variables;

    const result = Api.MutationService.insert.invoice({
      id,
      otherPartyId,
    } as unknown as Invoice);

    return response(context.data({ insertCustomerInvoice: result }));
  }
);

const deleteInvoice = graphql.mutation(
  'deleteInvoice',
  (request, response, context) => {
    const { variables } = request;
    const { invoiceId } = variables;

    Api.MutationService.remove.invoice(invoiceId);

    return response(context.data({ invoiceId }));
  }
);

export const namesList = graphql.query<
  Record<string, unknown>,
  NamesQueryVariables
>('names', (request, response, context) => {
  const { variables } = request;

  const result = Api.ResolverService.list.name(variables);

  return response(context.data({ names: result }));
});

export const invoiceList = graphql.query<
  Record<string, any>,
  InvoicesQueryVariables
>('invoices', (request, response, context) => {
  const { variables } = request;

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

export const invoiceDetailByInvoiceNumber = graphql.query(
  'invoiceByInvoiceNumber',
  (request, response, context) => {
    const { variables } = request;
    const { invoiceNumber } = variables;

    const invoice = Api.ResolverService.invoice.get.byInvoiceNumber(
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
  const result = Api.ResolverService.list.item(variables);

  return response(context.data({ items: result }));
});

export const itemsListView = graphql.query<
  Record<string, unknown>,
  ItemsListViewQueryVariables
>('itemsListView', (request, response, context) => {
  const { variables } = request;
  const result = Api.ResolverService.list.item(variables);

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
  const invoiceCounts = Api.ResolverService.statistics.invoice(type);

  return response(context.data({ invoiceCounts }));
});

export const stockCounts = graphql.query(
  'stockCounts',
  (_, response, context) => {
    const stockCounts = Api.ResolverService.statistics.stock();

    return response(context.data({ stockCounts }));
  }
);

/**
 * MSW Currently does not support batched mutations. Instead, inspect every outgoing POST
 * and check if the body is an array and each of the elements of the array has an existing
 * handler.
 */
// const batchMutationHandler = rest.post(
//   'http://localhost:4000',
//   async (req, res) => {
//     // This will ensure this handler does not try to handle the request
//     console.warn('***** request ****', req);

//     if (!Array.isArray(req.body)) {
//       console.warn('request body is not an array!!');
//       throw new Error('Unsupported');
//     }

//     // If the request body is an array, map each handler to a request and
//     // find a handler to hand it.
//     const data = await Promise.all(
//       req.body.map(async operation => {
//         const partReq = { ...req, body: operation };
//         const handler = handlers.find(handler => handler.test(partReq));

//         // no handler matched that operation
//         if (!handler) {
//           return Promise.reject(new Error('Unsupported'));
//         }

//         // execute and return the response-like object
//         return handler.run(partReq);
//       })
//     );

//     return res(res => {
//       res.headers.set('content-type', 'application/json');

//       // Map all requests back into an array to return
//       // for the original request.
//       res.body = JSON.stringify(
//         data.map(datum => {
//           return JSON.parse(datum?.response?.body) || {};
//         })
//       );

//       return res;
//     });
//   }
// );

export const handlers = [
  invoiceList,
  invoiceDetail,
  invoiceDetailByInvoiceNumber,
  updateInvoice,
  deleteInvoice,
  permissionError,
  serverError,
  insertInvoice,
  namesList,
  itemsListView,
  itemsWithStockLines,
  // batchMutationHandler,
  invoiceCounts,
  stockCounts,
];
