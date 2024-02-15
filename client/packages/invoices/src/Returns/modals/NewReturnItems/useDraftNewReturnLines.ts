import React, { useEffect } from 'react';
import { RecordPatch, SupplierReturnLine } from '@openmsupply-client/common';
import { useReturns } from '../../api';

export const useDraftNewReturnLines = (stockLineIds: string[]) => {
  const [draftLines, setDraftLines] = React.useState<SupplierReturnLine[]>([]);

  const lines = useReturns.lines.newReturnLines(stockLineIds);

  console.log('lines', lines);

  useEffect(() => {
    const newDraftLines = (lines ?? []).map(seed => ({ ...seed }));

    setDraftLines(newDraftLines);
  }, [lines]);

  const update = (patch: RecordPatch<SupplierReturnLine>) => {
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
