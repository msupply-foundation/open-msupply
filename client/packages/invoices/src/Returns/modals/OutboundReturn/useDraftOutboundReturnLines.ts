import React, { useEffect } from 'react';
import {
  FnUtils,
  OutboundReturnLineInput,
  RecordPatch,
} from '@openmsupply-client/common';
import { GenerateOutboundReturnLineFragment, useReturns } from '../../api';

export const useDraftOutboundReturnLines = ({
  stockLineIds,
  supplierId,
  itemId,
  returnId,
  inboundShipmentId,
}: {
  stockLineIds: string[];
  supplierId: string;
  itemId?: string;
  returnId?: string;
  inboundShipmentId?: string;
}) => {
  const [draftLines, setDraftLines] = React.useState<
    GenerateOutboundReturnLineFragment[]
  >([]);

  const data = useReturns.lines.outboundReturnLines(
    stockLineIds,
    itemId,
    returnId
  );
  const lines = data?.nodes;

  useEffect(() => {
    setDraftLines(lines ?? []);
  }, [lines]);

  const update = (patch: RecordPatch<GenerateOutboundReturnLineFragment>) => {
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

  const { mutateAsync: insert } = useReturns.document.insertOutboundReturn();
  const { mutateAsync: updateLines } = useReturns.lines.updateOutboundLines();

  const save = async () => {
    const outboundReturnLines: OutboundReturnLineInput[] = draftLines.map(
      line => {
        const { id, reasonId, numberOfPacksToReturn, stockLineId, note } = line;
        return { id, stockLineId, reasonId, note, numberOfPacksToReturn };
      }
    );

    if (!returnId) {
      await insert({
        id: FnUtils.generateUUID(),
        supplierId,
        inboundShipmentId,
        outboundReturnLines,
      });
    } else {
      await updateLines({
        outboundReturnId: returnId,
        outboundReturnLines,
      });
    }

    // TODO: error handling here
    // also need to consider what we do if the error was on the first page of the wizard
  };

  return { lines: draftLines, update, save };
};
