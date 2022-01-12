import { useParams } from 'react-router';
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
  stocktakeId: string;
};

const stocktakeLineToDraftLine = (
  stocktakeId: string,
  line: StocktakeLine
): DraftStocktakeLine => {
  return {
    isCreated: false,
    isUpdated: false,
    stocktakeId,
    ...line,
  };
};

const createDraftLine = (
  stocktakeId: string,
  item: Item
): DraftStocktakeLine => {
  return {
    stocktakeId,
    itemCode: item.code,
    itemName: item.name,
    countThisLine: true,
    isCreated: true,
    isUpdated: false,
    id: generateUUID(),
    expiryDate: null,
    itemId: item.id,
  };
};

const stockLineToDraftLine = (
  stocktakeId: string,
  line: StockLine
): DraftStocktakeLine => {
  return {
    stocktakeId,
    itemCode: '',
    itemName: '',
    countThisLine: false,
    isCreated: false,
    isUpdated: false,
    ...line,
    expiryDate: line.expiryDate ? new Date(line.expiryDate) : null,
    id: generateUUID(),
  };
};

const useDraftStocktakeLines = (
  item: Item | null
): [DraftStocktakeLine[], Dispatch<SetStateAction<DraftStocktakeLine[]>>] => {
  const { id = '' } = useParams();
  const { data: stocktakeLines } = useStocktakeLines(item?.id);
  const { data: stockLines } = useStockLines(item?.code || '');

  const [draftLines, setDraftLines] = React.useState<DraftStocktakeLine[]>([]);

  useEffect(() => {
    if (item) {
      const existing =
        stocktakeLines?.map(line => stocktakeLineToDraftLine(id, line)) ?? [];
      setDraftLines(existing);
    }
  }, [stocktakeLines, item]);

  useEffect(() => {
    const uncountedLines =
      stockLines?.filter(
        ({ id }) =>
          !stocktakeLines?.some(({ stockLineId }) => stockLineId === id)
      ) ?? [];
    const uncounted = uncountedLines.map(line =>
      stockLineToDraftLine(id, line)
    );
    setDraftLines(lines => [...lines, ...uncounted]);
  }, [stockLines]);

  return [draftLines, setDraftLines];
};

interface useStocktakeLineEditController {
  draftLines: DraftStocktakeLine[];
  update: (patch: RecordPatch<StocktakeLine>) => void;
  addLine: () => void;
}

export const useStocktakeLineEdit = (
  item: Item | null
): useStocktakeLineEditController => {
  const { id = '' } = useParams();
  const [draftLines, setDraftLines] = useDraftStocktakeLines(item);

  const update = (patch: RecordPatch<StocktakeLine>) => {
    setDraftLines(lines => {
      return lines.map(line => {
        if (line.id === patch.id) {
          return { ...line, ...patch, isUpdated: true };
        }
        return line;
      });
    });
  };

  const addLine = () => {
    if (item) {
      setDraftLines(lines => [...lines, createDraftLine(id, item)]);
    }
  };

  return { draftLines, update, addLine };
};
