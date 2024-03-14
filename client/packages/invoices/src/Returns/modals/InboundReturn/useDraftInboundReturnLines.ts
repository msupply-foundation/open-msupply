import React, { useEffect } from 'react';
import {
  FnUtils,
  InboundReturnInput,
  GeneratedInboundReturnLineNode,
  InboundReturnLineInput,
  RecordPatch,
} from '@openmsupply-client/common';
import { useReturns } from '../../api';
import { useItemById } from '@openmsupply-client/system';

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

  const { data: item } = useItemById(itemId);

  const { refetch } = useReturns.lines.generateInboundReturnLines(
    outboundShipmentLineIds,
    returnId,
    itemId
  );

  const { mutateAsync } = useReturns.document.insertInboundReturn();

  useEffect(() => {
    if (!draftLines.length) getLines();

    async function getLines() {
      const { data } = await refetch();
      const lines = data?.nodes ?? [];

      if (lines.length) {
        setDraftLines(lines);
      } else {
        addPlaceholderLine();
      }
    }
  }, [item]);

  // TODO: ew?
  const addPlaceholderLine = () => {
    if (!item) return;

    setDraftLines(currLines => {
      return [
        ...currLines,
        {
          __typename: 'GeneratedInboundReturnLineNode' as const,
          id: FnUtils.generateUUID(),
          itemId: item.id,
          itemCode: item.code,
          itemName: item.name,
          packSize: item.defaultPackSize,
          numberOfPacksReturned: 0,
          reasonId: null,
          batch: null,
          expiryDate: null,
          note: null,
        },
      ];
    });
  };

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
