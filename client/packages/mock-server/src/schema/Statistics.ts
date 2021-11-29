import { InvoiceNodeType } from '@openmsupply-client/common/src/types/schema';
import { Api } from '../api';
import { InvoiceCounts, StockCounts } from '../data/types';

const QueryResolvers = {
  invoiceCounts: (
    _: unknown,
    { type }: { type: InvoiceNodeType }
  ): InvoiceCounts => Api.ResolverService.statistics.invoice(type),

  stockCounts: (): StockCounts => Api.ResolverService.statistics.stock(),
};

export const Statistics = { QueryResolvers };
