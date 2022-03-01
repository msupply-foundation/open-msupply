import React, { useEffect, useState, useCallback } from 'react';
import {
  generateUUID,
  InvoiceLineNodeType,
  Item,
  StockLine,
} from '@openmsupply-client/common';
import { useStockLines } from '@openmsupply-client/system';
import { InvoiceLine, DraftOutboundLine } from '../../../../types';
import { sortByExpiry, issueStock } from '../utils';
import { useOutboundLines, useOutboundFields } from '../../../api';

export const createPlaceholderRow = (
  invoiceId: string,
  itemId = '',
  id = generateUUID()
): DraftOutboundLine => ({
  __typename: 'InvoiceLineNode',
  availableNumberOfPacks: 0,
  batch: 'Placeholder',
  costPricePerPack: 0,
  id,
  itemId,
  onHold: false,
  packSize: 1,
  sellPricePerPack: 0,
  storeId: '',
  totalNumberOfPacks: 0,
  numberOfPacks: 0,
  isCreated: true,
  isUpdated: false,
  stockLineId: 'placeholder',
  invoiceId,
  itemCode: '',
  itemName: '',
  type: InvoiceLineNodeType.UnallocatedStock,
});

interface DraftOutboundLineSeeds {
  invoiceId: string;
  stockLine?: Partial<StockLine> | null;
  invoiceLine?: Partial<InvoiceLine> | null;
}

export const createDraftOutboundLine = ({
  invoiceId,
  stockLine,
  invoiceLine,
}: DraftOutboundLineSeeds): DraftOutboundLine => ({
  __typename: 'InvoiceLineNode',
  isCreated: !invoiceLine,
  isUpdated: false,
  type: InvoiceLineNodeType.StockOut,
  numberOfPacks: 0,
  ...stockLine,
  ...invoiceLine,
  id: invoiceLine?.id ?? generateUUID(),
  availableNumberOfPacks:
    (stockLine?.availableNumberOfPacks || 0) +
    (invoiceLine?.numberOfPacks || 0),
  invoiceId,
  stockLineId: stockLine?.id ?? '',
  location: invoiceLine?.location,
  expiryDate: invoiceLine?.expiryDate || stockLine?.expiryDate,
  costPricePerPack: stockLine?.costPricePerPack ?? 0,
  sellPricePerPack: stockLine?.sellPricePerPack ?? 0,
  itemId: stockLine?.itemId ?? '',
  packSize: stockLine?.packSize ?? 0,
  onHold: stockLine?.onHold ?? false,
  storeId: stockLine?.storeId ?? '',
  totalNumberOfPacks: stockLine?.totalNumberOfPacks ?? 0,

  // TODO: When small changes to the API don't take weeks: Add itemCode and itemName
  // to StockLineNode so these are accurate. These currently aren't actually
  // used, so having an empty string is fine.
  itemCode: invoiceLine?.itemCode ?? '',
  itemName: invoiceLine?.itemName ?? '',
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
  item: Item | null
): UseDraftOutboundLinesControl => {
  const { id: invoiceId } = useOutboundFields('id');
  const { data: lines, isLoading: outboundLinesLoading } = useOutboundLines(
    item?.id ?? ''
  );
  const { data, isLoading } = useStockLines(item?.code ?? '');

  const [draftOutboundLines, setDraftOutboundLines] = useState<
    DraftOutboundLine[]
  >([]);

  useEffect(() => {
    if (!item) {
      return setDraftOutboundLines([]);
    }

    if (!data) return;

    setDraftOutboundLines(() => {
      if (!lines) return [];
      const rows = data
        .map(batch => {
          const invoiceLine = lines.find(
            ({ stockLine }) => stockLine?.id === batch.id
          );

          return createDraftOutboundLine({
            invoiceLine,
            stockLine: batch,
            invoiceId,
          });
        })
        .sort(sortByExpiry);

      const placeholder = lines.find(
        ({ type }) => type === InvoiceLineNodeType.UnallocatedStock
      );

      if (placeholder) {
        rows.push(
          createDraftOutboundLine({ invoiceId, invoiceLine: placeholder })
        );
      } else {
        rows.push(createPlaceholderRow(invoiceId, item.id));
      }

      return rows;
    });
  }, [data, lines, item, invoiceId]);

  const onChangeRowQuantity = useCallback(
    (batchId: string, value: number) => {
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
