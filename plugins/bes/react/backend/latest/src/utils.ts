import { format } from 'date-fns/format';
import { endOfDay } from 'date-fns';
import { EndpointItems } from './types';

type Batch = {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expiryDate?: any;
  batch?: string | null;
  availableNumberOfPacks: number;
  packSize: number;
  onHold: boolean;
  location?: {
    onHold: boolean;
  } | null;
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
    if (b.location && b.location.onHold) return false;
    if (!b.expiryDate || b.onHold) return false;
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

export function aggregateItemsByUniversalCode(items: EndpointItems[]) {
  return items.reduce<Array<EndpointItems>>((acc, item) => {
    const existing = acc.find(x => x.universalCode === item.universalCode);

    if (existing) {
      existing.numberOfUnits += item.numberOfUnits;
    } else {
      acc.push({
        universalCode: item.universalCode,
        numberOfUnits: item.numberOfUnits,
      });
    }

    return acc;
  }, []);
}
