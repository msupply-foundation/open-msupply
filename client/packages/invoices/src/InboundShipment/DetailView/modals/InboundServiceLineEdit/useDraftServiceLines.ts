import React, { useEffect, useMemo } from 'react';
import { RecordPatch } from '@openmsupply-client/common';
import { toItemWithPackSize, useItem } from '@openmsupply-client/system';
import { useInboundShipment } from '../../../api';
import { useSaveInboundLines } from '../../../api/hooks/utils';
import { DraftInboundLine } from './../../../../types';
import { CreateDraft } from '../utils';
import { isA } from '../../../../utils';

export const useDraftServiceLines = () => {
  const {
    query: { data },
    isExternal,
  } = useInboundShipment();
  const id = data?.id ?? '';
  const lines = useMemo(
    () => data?.lines.nodes.filter(isA.serviceLine) ?? [],
    [data?.lines.nodes]
  );
  const {
    serviceItem: { data: defaultServiceItem, isLoading },
  } = useItem();
  const { mutateAsync } = useSaveInboundLines(isExternal);

  const [draftLines, setDraftLines] = React.useState<DraftInboundLine[]>([]);

  useEffect(() => {
    const hasFetchedData = !!lines?.length && !!defaultServiceItem;
    const hasDraftLines = !!draftLines?.length;

    // After data has been fetched create draft lines for each service line.
    if (!hasDraftLines && hasFetchedData) {
      const newDraftLines = lines.map(seed =>
        CreateDraft.serviceLine({
          invoiceId: id,
          item: toItemWithPackSize({ item: defaultServiceItem }),
          seed,
        })
      );

      // If there were no service lines. Create one.
      if (!newDraftLines.length) {
        newDraftLines.push(
          CreateDraft.serviceLine({
            invoiceId: id,
            item: toItemWithPackSize({ item: defaultServiceItem }),
          })
        );
      }
      setDraftLines(newDraftLines);
    }
  }, [draftLines, lines, defaultServiceItem, id]);

  const update = (patch: RecordPatch<DraftInboundLine>) => {
    setDraftLines(currLines => {
      const newLines = currLines.map(line => {
        if (line.id !== patch.id) {
          return line;
        }
        const { totalBeforeTax, taxPercentage } = patch;
        const taxAmount = ((totalBeforeTax ?? 0) * (taxPercentage ?? 0)) / 100;
        const totalAfterTax = (totalBeforeTax ?? 0) + taxAmount;
        return { ...line, ...patch, totalAfterTax, isUpdated: true };
      });
      return newLines;
    });
  };

  const add = () => {
    setDraftLines(currLines => {
      if (defaultServiceItem) {
        const newRow = CreateDraft.serviceLine({
          invoiceId: id,
          item: toItemWithPackSize({ item: defaultServiceItem }),
        });
        return currLines.concat(newRow);
      }
      return currLines;
    });
  };

  const save = async () => {
    if (draftLines.length) {
      await mutateAsync(draftLines);
    }
  };

  return { lines: draftLines, update, add, save, isLoading };
};
