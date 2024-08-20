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
    setDraftLines(lines ?? []);
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

  const save = async () => {
    const supplierReturnLines: SupplierReturnLineInput[] = draftLines.map(
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
        supplierReturnLines,
      });
    } else {
      await updateLines({
        supplierReturnId: returnId,
        supplierReturnLines,
      });
    }

    // TODO: error handling here
    // also need to consider what we do if the error was on the first page of the wizard
  };

  return { lines: draftLines, update, save };
};
