import { DraftPrescriptionLine } from '../../../types';
import { useState } from 'react';

export interface UseDraftPrescriptionLinesControl {
  draftLines: DraftPrescriptionLine[];
  updateLineQuantity: (lineId: string, quantity: number) => void;
}

export const useDraftPrescriptionLines = (
  initialLines: DraftPrescriptionLine[]
): UseDraftPrescriptionLinesControl => {
  const [draftLines, setDraftLines] = useState(initialLines);

  const updateLineQuantity = (lineId: string, quantity: number) =>
    setDraftLines(draftLines =>
      draftLines.map(line => {
        if (line.id === lineId) {
          return {
            ...line,
            numberOfPacks: quantity,
          };
        }
        return line;
      })
    );

  return {
    draftLines,
    updateLineQuantity,
  };
};
