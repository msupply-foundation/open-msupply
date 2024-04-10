import { useQuery } from '@openmsupply-client/common';
import { StockLineRowFragment } from '../../..';
import { LEDGER } from './keys';
// import { useStockGraphQL } from '../useStockGraphQL';

// Replace with auto-gen type from graphql codegen
export interface LedgerLine {
  invoiceLineId: string;
  itemId: string;
  storeId: string;
  quantity: number;
  datetime: Date;
  name: string;
  type: string;
  reason: string | null;
}

export function useStockLedger(stockLine: StockLineRowFragment) {
  //   const { stockApi, storeId } = useStockGraphQL();

  const queryKey = [LEDGER, stockLine.id];
  const queryFn = async () => {
    return [
      {
        invoiceLineId: 'AAAA',
        itemId: '042B38856AB04B318FDBAEABADE932C1',
        storeId: '7F9C518F2EBE4D96A84CE25D4D2D6131',
        quantity: 100,
        datetime: new Date('2023-08-29 21:01:23.923744'),
        name: 'Tamaki Store',
        type: 'INBOUND_SHIPMENT',
        reason: null,
      },
      {
        invoiceLineId: 'BBBB',
        itemId: 'BBBB',
        storeId: 'BBBB',
        quantity: -546,
        datetime: new Date('2023-06-01 03:51:56.532995'),
        name: 'Inventory Adjustments',
        type: 'INVENTORY_REDUCTION',
        reason: 'Lost',
      },
      {
        invoiceLineId: 'CCCC',
        itemId: 'CCCC',
        storeId: 'CCCC',
        quantity: 100,
        datetime: new Date('2023-06-01 03:51:56.532995'),
        name: 'Inventory Adjustments',
        type: 'INVENTORY_ADDITION',
        reason: 'Found',
      },
    ] as LedgerLine[];
  };

  const query = useQuery({ queryKey, queryFn });
  return query;
}
