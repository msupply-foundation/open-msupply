import React, { useEffect } from 'react';
import {
  FnUtils,
  InboundReturnInput,
  GeneratedInboundReturnLineNode,
  InboundReturnLineInput,
  RecordPatch,
} from '@openmsupply-client/common';
import { useReturns } from '../../api';

export const useDraftInboundReturnLines = ({
  customerId,
  outboundShipmentLineIds,
  itemId,
  returnId,
}: {
  outboundShipmentLineIds: string[];
  customerId: string;
  itemId?: string;
  returnId?: string;
}) => {
  const [draftLines, setDraftLines] = React.useState<
    GeneratedInboundReturnLineNode[]
  >([]);

  const { refetch } = useReturns.lines.generateInboundReturnLines(
    outboundShipmentLineIds,
    returnId,
    itemId
  );

  const { mutateAsync } = useReturns.document.insertInboundReturn();

  useEffect(() => {
    const getLines = async () => {
      const { data } = await refetch();
      const lines = data?.nodes ?? [];

      setDraftLines(lines);
    };

    getLines();
  }, []);

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
