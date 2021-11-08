import { Api } from '../api';
import { InvoiceCounts, StockCounts } from '../data/types';

const QueryResolvers = {
  invoiceCounts: (
    _: any,
    { isInbound }: { isInbound: boolean }
  ): InvoiceCounts => Api.ResolverService.statistics.invoice(isInbound),

  stockCounts: (): StockCounts => Api.ResolverService.statistics.stock(),
};

export const Statistics = { QueryResolvers };
