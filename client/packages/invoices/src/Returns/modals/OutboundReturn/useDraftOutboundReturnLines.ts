import React, { useEffect } from 'react';
import {
  FnUtils,
  OutboundReturnInput,
  OutboundReturnLine,
  OutboundReturnLineInput,
  RecordPatch,
} from '@openmsupply-client/common';
import { useReturns } from '../../api';

export const useDraftOutboundReturnLines = (
  stockLineIds: string[],
  supplierId: string
) => {
  const [draftLines, setDraftLines] = React.useState<OutboundReturnLine[]>([]);

  const lines = useReturns.lines.outboundReturnLines(stockLineIds);

  const { mutateAsync } = useReturns.document.insertOutboundReturn();

  useEffect(() => {
    const newDraftLines = (lines ?? []).map(seed => ({ ...seed }));

    setDraftLines(newDraftLines);
  }, [lines]);

  const update = (patch: RecordPatch<OutboundReturnLine>) => {
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

  const saveOutboundReturn = async () => {
    const outboundReturnLines: OutboundReturnLineInput[] = draftLines.map(
      line => {
        const { id, reasonId, numberOfPacksToReturn, stockLineId, comment } =
          line;

        return { id, stockLineId, reasonId, comment, numberOfPacksToReturn };
      }
    );

    const input: OutboundReturnInput = {
      id: FnUtils.generateUUID(),
      supplierId,
      outboundReturnLines,
    };

    // TODO: error handling here
    // also need to consider what we do if the error was on the first page of the wizard
    await mutateAsync(input);
  };

  return { lines: draftLines, update, saveOutboundReturn };
};
