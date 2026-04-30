import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { ItemRowFragment, useItem } from '@openmsupply-client/system';
import { useStocktakeOld } from './../../../../api';
import { DraftStocktakeLine, get } from '../utils';
import { StocktakeLineFragment } from '../../../../api';

export const useDraftStocktakeLines = (
  item: ItemRowFragment | null,
  lines?: StocktakeLineFragment[]
): [DraftStocktakeLine[], Dispatch<SetStateAction<DraftStocktakeLine[]>>] => {
  const { id } = useStocktakeOld.document.fields('id');
  const {
    stockLinesFromItem: { data: stockLines },
  } = useItem(item?.id || '');
  const [draftLines, setDraftLines] = useState<DraftStocktakeLine[]>([]);

  useEffect(() => {
    if (!item) {
      setDraftLines([]);
      return;
    }

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
