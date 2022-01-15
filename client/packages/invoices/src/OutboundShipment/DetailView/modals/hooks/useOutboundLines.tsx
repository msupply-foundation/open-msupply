import React, { useEffect, useState } from 'react';
import { Item, StockLine, useParams } from '@openmsupply-client/common';
import { useStockLines } from '@openmsupply-client/system';
import { InvoiceLine, DraftOutboundLine } from '../../../../types';
import { sortByExpiry } from '../utils';
import { useOutboundLines } from '../../../api';

const createPlaceholderRow = (invoiceId: string): DraftOutboundLine => ({
  availableNumberOfPacks: 0,
  batch: 'Placeholder',
  costPricePerPack: 0,
  id: 'placeholder',
  itemId: 'placeholder',
  onHold: false,
  packSize: 1,
  sellPricePerPack: 0,
  storeId: '',
  totalNumberOfPacks: 0,
  numberOfPacks: 0,
  isCreated: false,
  isUpdated: false,
  stockLineId: 'placeholder',
  invoiceId,
  itemCode: '',
  itemName: '',
});

interface DraftOutboundLineSeeds {
  invoiceId: string;
  stockLine: StockLine;
  invoiceLine?: InvoiceLine | null;
}

const createDraftOutboundLine = ({
  invoiceId,
  stockLine,
  invoiceLine,
}: DraftOutboundLineSeeds): DraftOutboundLine => ({
  isCreated: false,
  isUpdated: false,

  ...stockLine,
  ...invoiceLine,
  id: '',
  availableNumberOfPacks:
    stockLine.availableNumberOfPacks + (invoiceLine?.numberOfPacks || 0),
  invoiceId,
  stockLineId: stockLine.id,
  location: invoiceLine?.location,
  expiryDate: invoiceLine?.expiryDate,

  // TODO: When small changes to the API don't take weeks: Add itemCode and itemName
  // to StockLineNode so these are accurate. These currently aren't actually
  // used, so having an empty string is fine.
  itemCode: invoiceLine?.itemCode ?? '',
  itemName: invoiceLine?.itemName ?? '',
  numberOfPacks: 0,
});

interface UseDraftOutboundLinesControl {
  draftOutboundLines: DraftOutboundLine[];
  isLoading: boolean;
  setDraftOutboundLines: React.Dispatch<
    React.SetStateAction<DraftOutboundLine[]>
  >;
}

export const useDraftOutboundLines = (
  item: Item | null
): UseDraftOutboundLinesControl => {
  const { id: invoiceId = '' } = useParams();
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
            ({ stockLineId }) => stockLineId === batch.id
          );

          return createDraftOutboundLine({
            invoiceLine,
            stockLine: batch,
            invoiceId,
          });
        })
        .sort(sortByExpiry);

      rows.push(createPlaceholderRow(invoiceId));
      return rows;
    });
  }, [data, lines]);

  return {
    draftOutboundLines,
    isLoading: isLoading || outboundLinesLoading,
    setDraftOutboundLines,
  };
};
