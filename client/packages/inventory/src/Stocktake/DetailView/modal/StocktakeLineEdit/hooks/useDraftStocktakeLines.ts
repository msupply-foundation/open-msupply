import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { useStockLines, ItemRowFragment } from '@openmsupply-client/system';
import { useStocktake } from './../../../../api';
import { DraftStocktakeLine, get } from '../utils';

export const useDraftStocktakeLines = (
  item: ItemRowFragment | null
): [DraftStocktakeLine[], Dispatch<SetStateAction<DraftStocktakeLine[]>>] => {
  const { id } = useStocktake.document.fields('id');
  const { data: stockLines } = useStockLines(item?.id || '');
  const { lines } = useStocktake.line.rows();
  const [draftLines, setDraftLines] = useState<DraftStocktakeLine[]>([]);

  useEffect(() => {
    if (!item) setDraftLines([]);
    const stocktakeLines = lines?.filter(line => line.item.id === item?.id);
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
  }, [stockLines, lines, item, id]);

  return [draftLines, setDraftLines];
};
