import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { useStockLines, ItemRowFragment } from '@openmsupply-client/system';
import { useStocktake } from './../../../../api';
import { DraftStocktakeLine, get } from '../utils';

export const useDraftStocktakeLines = (
  item: ItemRowFragment | null
): [DraftStocktakeLine[], Dispatch<SetStateAction<DraftStocktakeLine[]>>] => {
  const { id } = useStocktake.document.fields('id');
  const { data: stocktakeLines } = useStocktake.line.stocktakeLines(item?.id);
  const { data: stockLines } = useStockLines(item?.id || '');

  const [draftLines, setDraftLines] = useState<DraftStocktakeLine[]>([]);

  useEffect(() => {
    if (item && stockLines?.nodes && stocktakeLines) {
      const fromStockLines = get.draftLinesFromStockLines(
        id,
        stockLines.nodes,
        stocktakeLines
      );
      const fromStocktakeLines = get.draftLinesFromStocktakeLines(
        id,
        stocktakeLines ?? []
      );
      setDraftLines(fromStockLines.concat(fromStocktakeLines));
    }
  }, [stockLines, stocktakeLines, item]);

  return [draftLines, setDraftLines];
};
