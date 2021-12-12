import { InvoiceNodeType } from '@openmsupply-client/common/src/types/schema';
import { Api } from '../api';
import { InvoiceCounts, StockCounts } from '../data/types';

const QueryResolvers = {
  invoiceCounts: (
    _: unknown,
    { invoiceType }: { invoiceType: InvoiceNodeType }
  ): InvoiceCounts => Api.ResolverService.statistics.invoice(invoiceType),

  stockCounts: (): StockCounts => Api.ResolverService.statistics.stock(),
};

export const Statistics = { QueryResolvers };
