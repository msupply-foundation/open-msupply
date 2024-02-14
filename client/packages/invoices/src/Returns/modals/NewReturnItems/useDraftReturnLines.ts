import React, { useEffect } from 'react';
import {
  RecordPatch,
  SupplierReturnInput,
  SupplierReturnLine,
  SupplierReturnLineInput,
} from '@openmsupply-client/common';
import { useInbound } from 'packages/invoices/src/InboundShipment/api';
import { useReturns } from '../../api';

export type DraftReturnLine = SupplierReturnLine & {
  reasonId: string;
  comment: string;
};

export const useDraftReturnLines = (stockLineIds: string[]) => {
  const [draftLines, setDraftLines] = React.useState<DraftReturnLine[]>([]);

  const lines = useReturns.lines.newReturnLines(stockLineIds);

  const { mutateAsync } = useInbound.document.insertSupplierReturn();

  useEffect(() => {
    const newDraftLines = (lines ?? []).map(seed => ({
      ...seed,
      reasonId: '',
      comment: '',
    }));

    setDraftLines(newDraftLines);
  }, [lines]);

  const update = (patch: RecordPatch<DraftReturnLine>) => {
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

  const saveSupplierReturn = async () => {
    const supplierReturnLines: SupplierReturnLineInput[] = draftLines.map(
      line => {
        const { id, reasonId, numberOfPacksToReturn, stockLineId, comment } =
          line;

        return { id, stockLineId, reasonId, comment, numberOfPacksToReturn };
      }
    );

    const input: SupplierReturnInput = {
      id: 'new-uuid',
      supplierId: '?',
      supplierReturnLines,
    };

    mutateAsync(input);
  };

  return { lines: draftLines, update, saveSupplierReturn };
};
