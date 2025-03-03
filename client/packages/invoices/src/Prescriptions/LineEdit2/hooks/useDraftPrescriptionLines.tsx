import { DraftPrescriptionLine } from '../../../types';
import { useState } from 'react';
import { allocateQuantities } from '../../api/hooks/utils';
import { InvoiceNodeStatus } from '@common/types';

export interface UseDraftPrescriptionLinesControl {
  draftLines: DraftPrescriptionLine[];
  updateLineQuantity: (lineId: string, quantity: number) => void;
  allocateQuantity: (
    quantity: number,
    prescribedQuantity: number | null
  ) => DraftPrescriptionLine[] | undefined;
}

export const useDraftPrescriptionLines = (
  initialLines: DraftPrescriptionLine[],
  status: InvoiceNodeStatus
): UseDraftPrescriptionLinesControl => {
  const [draftLines, setDraftLines] = useState(initialLines);

  const updateLineQuantity = (lineId: string, quantity: number) =>
    setDraftLines(draftLines =>
      draftLines.map(line => {
        if (line.id === lineId) {
          return {
            ...line,
            numberOfPacks: quantity,
            isUpdated: true,
          };
        }
        return line;
      })
    );

  const allocateQuantity = (
    quantity: number,
    prescribedQuantity: number | null
  ) => {
    const updatedLines = allocateQuantities(status, draftLines)(
      quantity,
      null,
      true,
      prescribedQuantity
    );

    updatedLines && setDraftLines(updatedLines);

    return updatedLines;
  };

  return {
    draftLines,
    updateLineQuantity,
    allocateQuantity,
  };
};
