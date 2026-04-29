import React, { useEffect } from 'react';
import {
  FnUtils,
  SupplierReturnLineInput,
  RecordPatch,
} from '@openmsupply-client/common';
import { GenerateSupplierReturnLineFragment, useReturns } from '../../api';

export const useDraftSupplierReturnLines = ({
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
    GenerateSupplierReturnLineFragment[]
  >([]);

  const data = useReturns.lines.supplierReturnLines(
    stockLineIds,
    itemId,
    returnId
  );
  const lines = data?.nodes;

  useEffect(() => {
    const sorted = [...(lines ?? [])].sort((a, b) =>
      a.onHold === b.onHold ? 0 : a.onHold ? 1 : -1
    );
    setDraftLines(sorted);
  }, [lines]);

  const update = (patch: RecordPatch<GenerateSupplierReturnLineFragment>) => {
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

  const { mutateAsync: insert } = useReturns.document.insertSupplierReturn();
  const { mutateAsync: updateLines } = useReturns.lines.updateSupplierLines();

  const save = async (theirReference?: string) => {
    const supplierReturnLines: SupplierReturnLineInput[] = draftLines.map(
      line => {
        const { id, reasonOption, numberOfPacksToReturn, stockLineId, note } =
          line;
        return {
          id,
          stockLineId,
          reasonId: reasonOption?.id,
          note,
          numberOfPacksToReturn,
        };
      }
    );

    return !returnId
      ? await insert({
          id: FnUtils.generateUUID(),
          supplierId,
          inboundShipmentId,
          theirReference,
          supplierReturnLines,
        })
      : await updateLines({
          supplierReturnId: returnId,
          supplierReturnLines,
        });

    // TODO: error handling here
    // also need to consider what we do if the error was on the first page of the wizard
  };

  return { lines: draftLines, update, save };
};
