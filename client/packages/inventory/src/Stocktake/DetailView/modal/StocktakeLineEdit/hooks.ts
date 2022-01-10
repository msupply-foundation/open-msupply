import React, { useEffect, Dispatch, SetStateAction } from 'react';
import { StocktakeLine } from '../../../../types';

import {
  StockLine,
  RecordPatch,
  generateUUID,
  Item,
} from '@openmsupply-client/common';

import { useStockLines } from '@openmsupply-client/system';

import { useStocktakeLines } from '../../../api';

export type DraftStocktakeLine = StocktakeLine & {
  countThisLine: boolean;
  isCreated?: boolean;
  isUpdated?: boolean;
};

const stocktakeLineToDraftLine = (line: StocktakeLine): DraftStocktakeLine => {
  return {
    isCreated: false,
    isUpdated: false,
    ...line,
  };
};

const stockLineToDraftLine = (line: StockLine): DraftStocktakeLine => {
  return {
    itemCode: '',
    itemName: '',
    countThisLine: false,
    isCreated: false,
    isUpdated: false,
    ...line,
    id: generateUUID(),
  };
};

const useDraftStocktakeLines = (
  item: Item | null
): [DraftStocktakeLine[], Dispatch<SetStateAction<DraftStocktakeLine[]>>] => {
  const { data: stocktakeLines } = useStocktakeLines(item?.id);
  const { data: stockLines } = useStockLines(item?.code || '');

  //   const [counted, setCounted] = useState<DraftStocktakeLine[]>([]);
  //   const [uncounted, setUncounted] = useState<DraftStocktakeLine[]>([]);
  const [draftLines, setDraftLines] = React.useState<DraftStocktakeLine[]>([]);

  // TODO: Might need to 'merge' these lines, instead of appending.
  useEffect(() => {
    if (item) {
      const existing = stocktakeLines?.map(stocktakeLineToDraftLine) ?? [];
      setDraftLines(existing);
    }
  }, [stocktakeLines, item]);

  useEffect(() => {
    const uncountedLines =
      stockLines?.filter(
        ({ id }) =>
          !stocktakeLines?.some(({ stockLineId }) => stockLineId === id)
      ) ?? [];
    const uncounted = uncountedLines.map(stockLineToDraftLine);
    setDraftLines(lines => [...lines, ...uncounted]);
  }, [stockLines]);

  return [draftLines, setDraftLines];
};

export const useStocktakeLineEdit = (
  item: Item | null
): {
  draftLines: DraftStocktakeLine[];
  update: (patch: RecordPatch<StocktakeLine>) => void;
} => {
  const [draftLines, setDraftLines] = useDraftStocktakeLines(item);

  const update = (patch: RecordPatch<StocktakeLine>) => {
    setDraftLines(lines => {
      return lines.map(line => {
        if (line.id === patch.id) {
          return { ...line, ...patch };
        }
        return line;
      });
    });
  };

  return { draftLines, update };
};
