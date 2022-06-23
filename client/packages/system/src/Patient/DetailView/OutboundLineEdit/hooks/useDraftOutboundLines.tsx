import React, { useEffect, useState, useCallback } from 'react';
import {
  FnUtils,
  InvoiceLineNodeType,
  InvoiceNodeStatus,
  useConfirmOnLeaving,
  useDirtyCheck,
  SortUtils,
} from '@openmsupply-client/common';
import { useStockLines, ItemRowFragment } from '@openmsupply-client/system';
import { DraftOutboundLine } from '../../../../types';
import { issueStock } from '../utils';
import { useOutbound } from '../../../api';
import {
  OutboundLineFragment,
  PartialStockLineFragment,
} from '../../../api/operations.generated';

export const createPlaceholderRow = (
  invoiceId: string,
  itemId: string,
  id = FnUtils.generateUUID()
): DraftOutboundLine => ({
  __typename: 'InvoiceLineNode',
  batch: '',
  id,
  packSize: 1,
  sellPricePerPack: 0,
  numberOfPacks: 0,
  isCreated: true,
  isUpdated: false,
  invoiceId,
  totalAfterTax: 0,
  totalBeforeTax: 0,
  expiryDate: undefined,
  type: InvoiceLineNodeType.UnallocatedStock,
  item: { id: itemId, code: '', name: '', __typename: 'ItemNode' },
});

interface DraftOutboundLineSeeds {
  invoiceId: string;
  invoiceLine: OutboundLineFragment;
}

export const createDraftOutboundLineFromStockLine = ({
  invoiceId,
  stockLine,
}: {
  invoiceId: string;
  stockLine: PartialStockLineFragment;
}): DraftOutboundLine => ({
  isCreated: true,
  isUpdated: false,
  type: InvoiceLineNodeType.StockOut,
  numberOfPacks: 0,
  location: stockLine?.location,
  expiryDate: stockLine?.expiryDate,
  sellPricePerPack: stockLine?.sellPricePerPack ?? 0,
  packSize: stockLine?.packSize ?? 0,
  id: FnUtils.generateUUID(),
  invoiceId,
  totalAfterTax: 0,
  totalBeforeTax: 0,
  __typename: 'InvoiceLineNode',

  // TODO: StockLineNode.Item needed from API to fill this correctly.
  item: {
    id: stockLine?.itemId ?? '',
    name: '',
    code: '',
    __typename: 'ItemNode',
  },

  stockLine,
});

export const createDraftOutboundLine = ({
  invoiceLine,
}: DraftOutboundLineSeeds): DraftOutboundLine => ({
  isCreated: !invoiceLine,
  isUpdated: false,
  ...invoiceLine,
  // When creating a draft outbound from an existing outbound line, add the available quantity
  // to the number of packs. This is because the available quantity has been adjusted for outbound
  // lines that have been saved.
  ...(invoiceLine.stockLine
    ? {
        stockLine: {
          ...invoiceLine.stockLine,
          availableNumberOfPacks:
            invoiceLine.stockLine.availableNumberOfPacks +
            invoiceLine.numberOfPacks,
        },
      }
    : {}),
});

interface UseDraftOutboundLinesControl {
  draftOutboundLines: DraftOutboundLine[];
  updateQuantity: (batchId: string, quantity: number) => void;
  isLoading: boolean;
  setDraftOutboundLines: React.Dispatch<
    React.SetStateAction<DraftOutboundLine[]>
  >;
}

export const useDraftOutboundLines = (
  item: ItemRowFragment | null
): UseDraftOutboundLinesControl => {
  const { id: invoiceId, status } = useOutbound.document.fields([
    'id',
    'status',
  ]);
  const { data: lines, isLoading: outboundLinesLoading } =
    useOutbound.line.stockLines(item?.id ?? '');
  const { data, isLoading } = useStockLines(item?.id);
  const { isDirty, setIsDirty } = useDirtyCheck();
  const [draftOutboundLines, setDraftOutboundLines] = useState<
    DraftOutboundLine[]
  >([]);

  useConfirmOnLeaving(isDirty);

  useEffect(() => {
    if (!item) {
      return setDraftOutboundLines([]);
    }

    if (!data) return;

    setDraftOutboundLines(() => {
      const rows = data.nodes
        .map(batch => {
          const invoiceLine = lines?.find(
            ({ stockLine }) => stockLine?.id === batch.id
          );

          if (invoiceLine) {
            return createDraftOutboundLine({
              invoiceLine,
              invoiceId,
            });
          } else {
            return createDraftOutboundLineFromStockLine({
              stockLine: batch,
              invoiceId,
            });
          }
        })
        .sort(SortUtils.byExpiryAsc);

      if (status === InvoiceNodeStatus.New) {
        let placeholder = lines?.find(
          ({ type }) => type === InvoiceLineNodeType.UnallocatedStock
        );
        if (!placeholder) {
          placeholder = draftOutboundLines.find(
            ({ type }) => type === InvoiceLineNodeType.UnallocatedStock
          );
        }
        if (placeholder) {
          rows.push(
            createDraftOutboundLine({ invoiceId, invoiceLine: placeholder })
          );
        } else {
          rows.push(createPlaceholderRow(invoiceId, item.id));
        }
      }

      return rows;
    });
  }, [data, lines, item, invoiceId]);

  const onChangeRowQuantity = useCallback(
    (batchId: string, value: number) => {
      setIsDirty(true);
      setDraftOutboundLines(issueStock(draftOutboundLines, batchId, value));
    },
    [draftOutboundLines]
  );

  return {
    draftOutboundLines,
    isLoading: isLoading || outboundLinesLoading,
    setDraftOutboundLines,
    updateQuantity: onChangeRowQuantity,
  };
};
