import { graphql } from 'msw';
import { ResolverService } from './../../api/resolvers/index';
import {
  mockStockCountsQuery,
  mockInvoiceCountsQuery,
} from '@openmsupply-client/common/src/types/schema';

const mockInvoiceCounts = mockInvoiceCountsQuery((req, res, ctx) => {
  const { variables } = req;
  const { type } = variables;
  const invoiceCounts = ResolverService.statistics.invoice(type);

  return res(
    ctx.data({
      invoiceCounts: { ...invoiceCounts, __typename: 'InvoiceCountsConnector' },
    })
  );
});

const mockStockCounts = mockStockCountsQuery((_, res, ctx) => {
  const stockCounts = ResolverService.statistics.stock();

  return res(
    ctx.data({
      stockCounts: { ...stockCounts, __typename: 'StockCountsConnector' },
    })
  );
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

export const ExperimentalHandlers = [
  mockInvoiceCounts,
  mockStockCounts,
  permissionError,
  serverError,
];
