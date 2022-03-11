import React, { useEffect } from 'react';
import {
  RecordPatch,
  InvoiceLineNodeType,
  generateUUID,
} from '@openmsupply-client/common';
import {
  useDefaultServiceItem,
  ItemRowFragment,
} from '@openmsupply-client/system';
import {
  useInboundFields,
  useSaveInboundLines,
  InboundLineFragment,
  useInboundServiceLines,
} from '../../../api';
import { DraftInboundLine } from './../../../../types';

const createDraftLine = ({
  item,
  invoiceId,
  seed,
}: {
  item: ItemRowFragment;
  invoiceId: string;
  seed?: InboundLineFragment;
}): DraftInboundLine => ({
  __typename: 'InvoiceLineNode',
  id: generateUUID(),
  item,
  invoiceId,
  totalAfterTax: 0,
  totalBeforeTax: 0,
  numberOfPacks: 0,
  packSize: 0,
  sellPricePerPack: 0,
  note: '',
  type: InvoiceLineNodeType.Service,
  isCreated: !seed,
  isUpdated: false,
  isDeleted: false,
  costPricePerPack: 0,
  ...seed,
});

export const useDraftServiceLines = () => {
  const { id } = useInboundFields('id');
  const { data: lines } = useInboundServiceLines();
  const { defaultServiceItem, isLoading } = useDefaultServiceItem();
  const { mutate } = useSaveInboundLines();

  const [draftLines, setDraftLines] = React.useState<DraftInboundLine[]>([]);

  useEffect(() => {
    const hasFetchedData = !!lines?.length && !!defaultServiceItem;
    const hasDraftLines = !!draftLines?.length;

    // After data has been fetched create draft lines for each service line.
    if (!hasDraftLines && hasFetchedData) {
      const newDraftLines = lines.map(seed =>
        createDraftLine({ invoiceId: id, item: defaultServiceItem, seed })
      );

      // If there were no service lines. Create one.
      if (!newDraftLines.length) {
        newDraftLines.push(
          createDraftLine({
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
        const newRow = createDraftLine({
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
