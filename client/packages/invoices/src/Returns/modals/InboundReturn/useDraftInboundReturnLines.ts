import React, { useEffect } from 'react';
import {
  FnUtils,
  InboundReturnInput,
  GeneratedInboundReturnLineNode,
  InboundReturnLineInput,
  RecordPatch,
} from '@openmsupply-client/common';
import { useReturns } from '../../api';

export const useDraftInboundReturnLines = (
  outboundReturnLineIds: string[],
  customerId: string
) => {
  const [draftLines, setDraftLines] = React.useState<
    GeneratedInboundReturnLineNode[]
  >([]);

  const data = useReturns.lines.generateInboundReturnLines(
    outboundReturnLineIds
  );
  const lines = data?.nodes;

  const { mutateAsync } = useReturns.document.insertInboundReturn();

  useEffect(() => {
    const newDraftLines = (lines ?? []).map(seed => ({ ...seed }));

    setDraftLines(newDraftLines);
  }, [lines]);

  const update = (patch: RecordPatch<GeneratedInboundReturnLineNode>) => {
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
      ({
        id,
        reasonId,
        itemId,
        numberOfPacksReturned,
        note,
        packSize,
        batch,
        expiryDate,
      }) => {
        return {
          id,
          packSize,
          batch,
          expiryDate,
          itemId,
          reasonId,
          note,
          numberOfPacksReturned,
        };
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
