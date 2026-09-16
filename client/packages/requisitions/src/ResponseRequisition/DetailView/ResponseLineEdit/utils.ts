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

interface ReasonDisabledInput {
  /** The requisition is not editable at all (finalised, wrong store, ...). */
  disabled: boolean;
  /** Transferred from a customer's internal order (has a linkedRequisition). */
  isLinked: boolean;
  requestedQuantity?: number;
  suggestedQuantity?: number;
  /** The reason already saved on the line, before any edits in this modal. */
  savedReasonId?: string | null;
}

/**
 * Whether the variance-reason picker is locked.
 *
 * A reason is only meaningful at a variance (requested differs from
 * suggested), so at equality the picker is always locked.
 *
 * On a requisition transferred from a customer's internal order the reason
 * that arrived with the transfer is the customer's: the supplier must not
 * change it (#11316). But a line can arrive with a variance and no reason
 * (the customer's store doesn't run the reason check, or the reason didn't
 * make it across). The server then rejects every save of that line and the
 * finalise of the whole requisition until a reason is set, so the picker
 * has to stay open for the supplier in that one case. Once a reason is
 * saved it locks like any other.
 */
export const isReasonDisabled = ({
  disabled,
  isLinked,
  requestedQuantity,
  suggestedQuantity,
  savedReasonId,
}: ReasonDisabledInput): boolean =>
  disabled ||
  requestedQuantity === suggestedQuantity ||
  (isLinked && !!savedReasonId);
