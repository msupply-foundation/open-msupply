import { useMemo } from 'react';
import { DraftResponseLine } from './hooks';

export const useStockCalculations = (draft?: DraftResponseLine | null) => {
  return useMemo(() => {
    const incomingStock =
      (draft?.incomingUnits ?? 0) + (draft?.additionInUnits ?? 0);
    const outgoingStock =
      (draft?.lossInUnits ?? 0) + (draft?.outgoingUnits ?? 0);
    const available =
      (draft?.initialStockOnHandUnits ?? 0) + incomingStock - outgoingStock;
    const mos = () => {
      if (draft?.linkedRequisitionLine) {
        return draft.linkedRequisitionLine.itemStats
          .availableMonthsOfStockOnHand;
      }

      if (
        draft?.averageMonthlyConsumption &&
        draft.averageMonthlyConsumption > 0
      ) {
        return available / draft.averageMonthlyConsumption;
      }

      return 0;
    };

    return {
      available,
      mos,
    };
  }, [draft]);
};
