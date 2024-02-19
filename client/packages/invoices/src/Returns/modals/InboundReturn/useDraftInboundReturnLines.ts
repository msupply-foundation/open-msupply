import React, { useEffect } from 'react';
import { InboundReturnLine, RecordPatch } from '@openmsupply-client/common';
import { useReturns } from '../../api';

export const useDraftInboundReturnLines = (stockLineIds: string[]) => {
  const [draftLines, setDraftLines] = React.useState<InboundReturnLine[]>([]);

  const lines = useReturns.lines.inboundReturnLines(stockLineIds);

  useEffect(() => {
    const newDraftLines = (lines ?? []).map(seed => ({ ...seed }));

    setDraftLines(newDraftLines);
  }, [lines]);

  const update = (patch: RecordPatch<InboundReturnLine>) => {
    setDraftLines(currLines => {
      const newLines = currLines.map(line => {
        if (line.id !== patch.id) {
          return line;
        }
        return { ...line, ...patch };
      });
      return newLines;
    });
  };

  return { lines: draftLines, update };
};
