import React, { useEffect } from 'react';
import {
  FnUtils,
  RecordPatch,
  SupplierReturnInput,
  SupplierReturnLine,
  SupplierReturnLineInput,
} from '@openmsupply-client/common';
import { useReturns } from '../../api';

export type DraftSupplierReturnLine = SupplierReturnLine & {
  reasonId: string;
  comment: string;
};

export const useDraftOutboundReturnLines = (
  stockLineIds: string[],
  supplierId: string
) => {
  const [draftLines, setDraftLines] = React.useState<DraftSupplierReturnLine[]>(
    []
  );

  const lines = useReturns.lines.outboundReturnLines(stockLineIds);

  const { mutateAsync } = useReturns.document.insertOutboundReturn();

  useEffect(() => {
    const newDraftLines = (lines ?? []).map(seed => ({
      ...seed,
      reasonId: '',
      comment: '',
    }));

    setDraftLines(newDraftLines);
  }, [lines]);

  const update = (patch: RecordPatch<DraftSupplierReturnLine>) => {
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

  const saveOutboundReturn = async () => {
    const outboundReturnLines: SupplierReturnLineInput[] = draftLines.map(
      line => {
        const { id, reasonId, numberOfPacksToReturn, stockLineId, comment } =
          line;

        return { id, stockLineId, reasonId, comment, numberOfPacksToReturn };
      }
    );

    const input: SupplierReturnInput = {
      id: FnUtils.generateUUID(),
      supplierId,
      supplierReturnLines: outboundReturnLines,
    };

    // TODO: error handling here
    // also need to consider what we do if the error was on the first page of the wizard
    await mutateAsync(input);
  };

  return { lines: draftLines, update, saveOutboundReturn };
};
