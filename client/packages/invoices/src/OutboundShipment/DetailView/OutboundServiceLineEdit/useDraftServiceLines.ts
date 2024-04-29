import React, { useEffect } from 'react';
import {
  RecordPatch,
  InvoiceLineNodeType,
  FnUtils,
} from '@openmsupply-client/common';
import {
  useDefaultServiceItem,
  ItemRowFragment,
} from '@openmsupply-client/system';
import { useOutbound } from '../../api';
import { DraftStockOutLine } from './../../../types';
import { StockOutLineFragment } from '../../../StockOut';

const createDraftLine = ({
  item,
  invoiceId,
  seed,
}: {
  item: ItemRowFragment;
  invoiceId: string;
  seed?: StockOutLineFragment;
}): DraftStockOutLine => ({
  __typename: 'InvoiceLineNode',
  id: FnUtils.generateUUID(),
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
  itemName: item.name,
  ...seed,
});

export const useDraftServiceLines = () => {
  const { id } = useOutbound.document.fields('id');
  const { data: lines } = useOutbound.line.serviceLines();
  const { defaultServiceItem, isLoading } = useDefaultServiceItem();
  const { status } = useOutbound.document.fields('status');
  const { mutateAsync } = useOutbound.line.save(status);

  const [draftLines, setDraftLines] = React.useState<DraftStockOutLine[]>([]);

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

  const update = (patch: RecordPatch<DraftStockOutLine>) => {
    setDraftLines(currLines => {
      const newLines = currLines.map(line => {
        const taxAmount =
          (patch.totalBeforeTax ?? 0) * ((patch.taxRate ?? 0) / 100);
        const totalAfterTax = (patch.totalBeforeTax ?? 0) + taxAmount;
        const newPatch = { ...patch, totalAfterTax };
        if (line.id === patch.id)
          return { ...line, ...newPatch, isUpdated: true };
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
      await mutateAsync(draftLines);
    }
  };

  return { lines: draftLines, update, add, save, isLoading };
};
