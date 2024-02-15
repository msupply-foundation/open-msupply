import React, { useEffect } from 'react';
import { InboundReturnLine, RecordPatch } from '@openmsupply-client/common';
import { useReturns } from '../../api';

export type DraftInboundReturnLine = InboundReturnLine & {
  reasonId: string;
  comment: string;
};

export const useDraftInboundReturnLines = (stockLineIds: string[]) => {
  const [draftLines, setDraftLines] = React.useState<DraftInboundReturnLine[]>(
    []
  );

  const lines = useReturns.lines.inboundReturnLines(stockLineIds);

  useEffect(() => {
    const newDraftLines = (lines ?? []).map(seed => ({
      ...seed,
      reasonId: '',
      comment: '',
    }));

    setDraftLines(newDraftLines);
  }, [lines]);

  const update = (patch: RecordPatch<DraftInboundReturnLine>) => {
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
