import React, { useEffect } from 'react';
import {
  FnUtils,
  InboundReturnLineInput,
  RecordPatch,
} from '@openmsupply-client/common';
import { GenerateInboundReturnLineFragment, useReturns } from '../../api';
import { useItemById } from '@openmsupply-client/system';

export const useDraftInboundReturnLines = ({
  customerId,
  outboundShipmentLineIds,
  itemId,
  returnId,
  outboundShipmentId,
}: {
  outboundShipmentLineIds: string[];
  customerId: string;
  itemId?: string;
  returnId?: string;
  outboundShipmentId?: string;
}) => {
  const [draftLines, setDraftLines] = React.useState<
    GenerateInboundReturnLineFragment[]
  >([]);

  const { data: item } = useItemById(itemId);

  const { refetch } = useReturns.lines.generateInboundReturnLines(
    outboundShipmentLineIds,
    returnId,
    itemId
  );

  const { mutateAsync: insert } = useReturns.document.insertInboundReturn();
  const { mutateAsync: updateLines } = useReturns.lines.updateInboundLines();

  useEffect(() => {
    getLines();

    async function getLines() {
      const { data } = await refetch();
      const lines = data?.nodes ?? [];

      if (lines.length) {
        setDraftLines(lines);
      } else {
        addDraftLine();
      }
    }
  }, [item]);

  const addDraftLine = () => {
    if (!item) return;

    setDraftLines(currLines => {
      return [
        ...currLines,
        {
          __typename: 'InboundReturnLineNode' as const,
          id: FnUtils.generateUUID(),
          item,
          itemCode: item.code,
          itemName: item.name,
          packSize: item.defaultPackSize,
          numberOfPacksReturned: 0,
          batch: null,
          expiryDate: null,
          note: null,
          reasonId: null,
        },
      ];
    });
  };

  const update = (patch: RecordPatch<GenerateInboundReturnLineFragment>) => {
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

  const save = async () => {
    const inboundReturnLines: InboundReturnLineInput[] = draftLines.map(
      ({
        id,
        reasonId,
        item: { id: itemId },
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

    // TODO: error handling here
    // also need to consider what we do if the error was on the first page of the wizard
    if (!returnId) {
      await insert({
        id: FnUtils.generateUUID(),
        customerId,
        outboundShipmentId,
        inboundReturnLines,
      });
    } else {
      await updateLines({
        inboundReturnId: returnId,
        inboundReturnLines,
      });
    }
  };

  return { lines: draftLines, update, save, addDraftLine };
};
