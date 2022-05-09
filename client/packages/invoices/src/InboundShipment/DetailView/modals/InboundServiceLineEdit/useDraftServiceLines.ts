import React, { useEffect } from 'react';
import { RecordPatch } from '@openmsupply-client/common';
import { useDefaultServiceItem } from '@openmsupply-client/system';
import { useInbound } from '../../../api';
import { DraftInboundLine } from './../../../../types';
import { CreateDraft } from '../utils';

export const useDraftServiceLines = () => {
  const { id } = useInbound.document.fields('id');
  const { data: lines } = useInbound.lines.serviceLines();
  const { defaultServiceItem, isLoading } = useDefaultServiceItem();
  const { mutate } = useInbound.lines.save();

  const [draftLines, setDraftLines] = React.useState<DraftInboundLine[]>([]);

  useEffect(() => {
    const hasFetchedData = !!lines?.length && !!defaultServiceItem;
    const hasDraftLines = !!draftLines?.length;

    // After data has been fetched create draft lines for each service line.
    if (!hasDraftLines && hasFetchedData) {
      const newDraftLines = lines.map(seed =>
        CreateDraft.serviceLine({
          invoiceId: id,
          item: defaultServiceItem,
          seed,
        })
      );

      // If there were no service lines. Create one.
      if (!newDraftLines.length) {
        newDraftLines.push(
          CreateDraft.serviceLine({
            invoiceId: id,
            item: defaultServiceItem,
          })
        );
      }
      setDraftLines(newDraftLines);
    }
  }, [draftLines, lines, defaultServiceItem]);

  const update = (patch: RecordPatch<DraftInboundLine>) => {
    setDraftLines(currLines => {
      const newLines = currLines.map(line => {
        if (line.id === patch.id) return { ...line, ...patch, isUpdated: true };
        return line;
      });
      return newLines;
    });
  };

  const add = () => {
    setDraftLines(currLines => {
      if (defaultServiceItem) {
        const newRow = CreateDraft.serviceLine({
          invoiceId: id,
          item: defaultServiceItem,
        });
        return currLines.concat(newRow);
      }
      return currLines;
    });
  };

  const save = async () => {
    if (draftLines.length) {
      await mutate(draftLines);
    }
  };

  return { lines: draftLines, update, add, save, isLoading };
};
