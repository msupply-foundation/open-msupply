import React, { useEffect } from 'react';
import {
  FnUtils,
  InboundReturnInput,
  InboundReturnLine,
  InboundReturnLineInput,
  RecordPatch,
} from '@openmsupply-client/common';
import { useReturns } from '../../api';

export type DraftInboundReturnLine = InboundReturnLine & {
  reasonId: string;
  comment: string;
};

export const useDraftInboundReturnLines = (
  stockLineIds: string[],
  customerId: string
) => {
  const [draftLines, setDraftLines] = React.useState<DraftInboundReturnLine[]>(
    []
  );

  const lines = useReturns.lines.inboundReturnLines(stockLineIds);
  const { mutateAsync } = useReturns.document.insertInboundReturn();

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

  const saveInboundReturn = async () => {
    const inboundReturnLines: InboundReturnLineInput[] = draftLines.map(
      line => {
        const { id, reasonId, numberOfPacksReturned, stockLineId, comment } =
          line;

        return { id, stockLineId, reasonId, comment, numberOfPacksReturned };
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
