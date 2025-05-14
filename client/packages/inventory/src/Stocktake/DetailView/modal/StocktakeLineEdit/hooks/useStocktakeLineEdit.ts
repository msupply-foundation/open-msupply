import {
  RecordPatch,
  ArrayUtils,
  getErrorMessage,
} from '@openmsupply-client/common';
import { ItemRowFragment } from '@openmsupply-client/system';
import { StocktakeLineFragment, useStocktakeOld } from './../../../../api';
import { DraftStocktakeLine, DraftLine } from '../utils';
import { useNextItem } from './useNextItem';
import { useDraftStocktakeLines } from './useDraftStocktakeLines';
interface useStocktakeLineEditController {
  draftLines: DraftStocktakeLine[];
  update: (patch: RecordPatch<StocktakeLineFragment>) => void;
  addLine: () => void;
  save: () => Promise<{ errorMessages?: string[] }>;
  isSaving: boolean;
  nextItem: ItemRowFragment | null;
}

export const useStocktakeLineEdit = (
  item: ItemRowFragment | null
): useStocktakeLineEditController => {
  const { id } = useStocktakeOld.document.fields('id');
  const { items } = useStocktakeOld.line.rows();
  const filteredItems = items.filter(item => item.item?.id === item?.id);
  const nextItem = useNextItem(filteredItems, item?.id);
  const [draftLines, setDraftLines] = useDraftStocktakeLines(item);
  const { saveAndMapStructuredErrors: upsertLines, isLoading: isSaving } =
    useStocktakeOld.line.save();

  const defaultPackSize = 1;

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
      setDraftLines(lines => [
        DraftLine.fromItem(id, item, defaultPackSize),
        ...lines,
      ]);
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
