import { format } from 'date-fns/format';
import { endOfDay } from 'date-fns';

type Batch = {
  __typename?: 'StockLineNode' | undefined;
  id: string;
  expiryDate?: any;
  batch?: string | null | undefined;
  availableNumberOfPacks: number;
  packSize: number;
};

type SortBatchesType = {
  nullExpiryBatches: Batch[];
  unexpiredBatches: Batch[];
  expiredBatches: Batch[];
};

export const sortAndClassifyBatches = (batches: Batch[]): SortBatchesType => {
  const today = format(endOfDay(new Date()), 'yyyy-MM-dd');
  // Sort items available batches by expiry date
  const nullExpiryBatches = batches.filter(b => {
    return !b.expiryDate;
  });

  const validBatches = batches.filter(b => {
    if (!b.expiryDate) return false;
    return b;
  });

  const unexpiredBatches = validBatches
    .filter(b => {
      return b.expiryDate >= today;
    })
    .sort((a, b) => {
      return (
        new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
      );
    });

  const expiredBatches = validBatches
    .filter(b => {
      return b.expiryDate < today;
    })
    .sort((a, b) => {
      return (
        new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime()
      );
    });

  return {
    nullExpiryBatches,
    unexpiredBatches,
    expiredBatches,
  };
};

export const fixWeirdNumberAsIntBug = (num: number | string): number => {
  if (typeof num === 'string') {
    return Number.parseInt(num);
  }

  return num;
};
