import React, { useEffect } from 'react';
import {
  FnUtils,
  RecordPatch,
  SupplierReturnInput,
  SupplierReturnLine,
  SupplierReturnLineInput,
} from '@openmsupply-client/common';
import { useReturns } from '../../api';

export const useDraftSupplierReturnLines = (
  stockLineIds: string[],
  supplierId: string
) => {
  const [draftLines, setDraftLines] = React.useState<SupplierReturnLine[]>([]);

  const lines = useReturns.lines.supplierReturnLines(stockLineIds);

  const { mutateAsync } = useReturns.document.insertSupplierReturn();

  useEffect(() => {
    const newDraftLines = (lines ?? []).map(seed => ({ ...seed }));

    setDraftLines(newDraftLines);
  }, [lines]);

  const update = (patch: RecordPatch<SupplierReturnLine>) => {
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

  const saveSupplierReturn = async () => {
    const supplierReturnLines: SupplierReturnLineInput[] = draftLines.map(
      line => {
        const { id, reasonId, numberOfPacksToReturn, stockLineId, comment } =
          line;

        return { id, stockLineId, reasonId, comment, numberOfPacksToReturn };
      }
    );

    const input: SupplierReturnInput = {
      id: FnUtils.generateUUID(),
      supplierId,
      supplierReturnLines,
    };

    // TODO: error handling here
    // also need to consider what we do if the error was on the first page of the wizard
    await mutateAsync(input);
  };

  return { lines: draftLines, update, saveSupplierReturn };
};
