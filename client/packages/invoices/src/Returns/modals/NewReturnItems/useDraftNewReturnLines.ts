import React, { useEffect } from 'react';
import { RecordPatch, SupplierReturnLine } from '@openmsupply-client/common';
import { useReturns } from '../../api';

export type DraftReturnLine = SupplierReturnLine & {
  reasonId: string;
  comment: string;
};

export const useDraftNewReturnLines = (stockLineIds: string[]) => {
  const [draftLines, setDraftLines] = React.useState<DraftReturnLine[]>([]);

  const lines = useReturns.lines.newReturnLines(stockLineIds);

  // TODO convert to just reasonId, comment, stockLineId, num of packs for submit
  useEffect(() => {
    const newDraftLines = (lines ?? []).map(seed => ({
      ...seed,
      reasonId: '',
      comment: '',
    }));

    setDraftLines(newDraftLines);
  }, [lines]);

  const update = (patch: RecordPatch<DraftReturnLine>) => {
    setDraftLines(currLines => {
      const newLines = currLines.map(line => {
        if (line.id !== patch.id) {
          return line;
        }
        return { ...line, ...patch, isUpdated: true };
      });
      return newLines;
    });
  };

  return { lines: draftLines, update };
};
