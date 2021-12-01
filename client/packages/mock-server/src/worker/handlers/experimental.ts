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

export const ExperimentalHandlers = [mockInvoiceCounts, mockStockCounts];
