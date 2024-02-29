import React, { useEffect } from 'react';
import {
  FnUtils,
  OutboundReturnInput,
  OutboundReturnLineNode,
  OutboundReturnLineInput,
  RecordPatch,
} from '@openmsupply-client/common';
import { useReturns } from '../../api';

export const useDraftOutboundReturnLines = (
  stockLineIds: string[],
  supplierId: string,
  itemId?: string
) => {
  const [draftLines, setDraftLines] = React.useState<OutboundReturnLineNode[]>(
    []
  );

  const data = useReturns.lines.outboundReturnLines(stockLineIds, itemId);
  const lines = data?.nodes;

  const { mutateAsync } = useReturns.document.insertOutboundReturn();

  useEffect(() => {
    const newDraftLines = (lines ?? []).map(seed => ({ ...seed }));

    setDraftLines(newDraftLines);
  }, [lines]);

  const update = (patch: RecordPatch<OutboundReturnLineNode>) => {
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
        const { id, reasonId, numberOfPacksToReturn, stockLineId, note } = line;

        return { id, stockLineId, reasonId, note, numberOfPacksToReturn };
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
