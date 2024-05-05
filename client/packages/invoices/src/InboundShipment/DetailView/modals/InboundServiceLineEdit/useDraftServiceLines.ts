import React, { useEffect } from 'react';
import { RecordPatch } from '@openmsupply-client/common';
import {
  toItemWithPackSize,
  useDefaultServiceItem,
} from '@openmsupply-client/system';
import { useInbound } from '../../../api';
import { DraftInboundLine } from './../../../../types';
import { CreateDraft } from '../utils';

export const useDraftServiceLines = () => {
  const { id } = useInbound.document.fields('id');
  const { data: lines } = useInbound.lines.serviceLines();
  const { defaultServiceItem, isLoading } = useDefaultServiceItem();
  const { mutateAsync } = useInbound.lines.save();

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
  }, [draftLines, lines, defaultServiceItem]);

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
