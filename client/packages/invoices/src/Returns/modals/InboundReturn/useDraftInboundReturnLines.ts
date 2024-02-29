import React, { useEffect } from 'react';
import {
  FnUtils,
  InboundReturnInput,
  InboundReturnLine,
  InboundReturnLineInput,
  RecordPatch,
} from '@openmsupply-client/common';
import { useReturns } from '../../api';

export const useDraftInboundReturnLines = (
  stockLineIds: string[],
  customerId: string
) => {
  const [draftLines, setDraftLines] = React.useState<InboundReturnLine[]>([]);

  const lines = useReturns.lines.inboundReturnLines(stockLineIds);
  const { mutateAsync } = useReturns.document.insertInboundReturn();

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

  const saveInboundReturn = async () => {
    const inboundReturnLines: InboundReturnLineInput[] = draftLines.map(
      ({ id, reasonId, numberOfPacksReturned, stockLineId, note }) => {
        return { id, stockLineId, reasonId, note, numberOfPacksReturned };
      }
    );

    const input: InboundReturnInput = {
      id: FnUtils.generateUUID(),
      customerId,
      inboundReturnLines,
    };

    // TODO: error handling here
    // also need to consider what we do if the error was on the first page of the wizard
    await mutateAsync(input);
  };

  return { lines: draftLines, update, saveInboundReturn };
};
