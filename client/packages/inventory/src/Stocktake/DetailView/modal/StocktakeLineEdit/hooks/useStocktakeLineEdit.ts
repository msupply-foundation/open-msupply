import {
  RecordPatch,
  ArrayUtils,
  getErrorMessage,
} from '@openmsupply-client/common';
import { useStocktakeOld } from './../../../../api';
import { DraftStocktakeLine, DraftLine } from '../utils';
import { useNextItem } from './useNextItem';
import { useDraftStocktakeLines } from './useDraftStocktakeLines';
import { StocktakeSummaryItem } from '../../../../../types';
import { StocktakeLineFragment } from '../../../../api';

interface useStocktakeLineEditController {
  draftLines: DraftStocktakeLine[];
  update: (patch: RecordPatch<DraftStocktakeLine>) => void;
  addLine: () => void;
  save: () => Promise<{ errorMessages?: string[] }>;
  isSaving: boolean;
  nextItem: DraftStocktakeLine['item'] | null;
}

export const useStocktakeLineEdit = (
  item: DraftStocktakeLine['item'] | null,
  items: StocktakeSummaryItem[],
  lines?: StocktakeLineFragment[]
): useStocktakeLineEditController => {
  const { id } = useStocktakeOld.document.fields('id');
  const filteredItems = items.filter(item => item.item?.id === item?.id);
  const nextItem = useNextItem(filteredItems, item?.id);
  const [draftLines, setDraftLines] = useDraftStocktakeLines(item, lines);
  const { saveAndMapStructuredErrors: upsertLines, isLoading: isSaving } =
    useStocktakeOld.line.save();

  const update = (patch: RecordPatch<DraftStocktakeLine>) =>
    setDraftLines(lines =>
      ArrayUtils.immutablePatch(lines, {
        ...patch,
        isUpdated: !patch.isCreated,
      })
    );

  const save = async () => {
    try {
      return await upsertLines(draftLines);
    } catch (e) {
      return { errorMessages: [getErrorMessage(e)] };
    }
  };

  const addLine = () => {
    if (item) {
      setDraftLines(lines => [DraftLine.fromItem(id, item), ...lines]);
    }
  };

  return {
    draftLines,
    update,
    addLine,
    save,
    isSaving,
    nextItem,
  };
};
