import { RecordPatch, ArrayUtils } from '@openmsupply-client/common';
import { ItemRowFragment } from '@openmsupply-client/system';
import {
  StocktakeLineFragment,
  UpsertStocktakeLinesMutation,
  useStocktake,
} from './../../../../api';
import { DraftStocktakeLine, DraftLine } from '../utils';
import { useNextItem } from './useNextItem';
import { useDraftStocktakeLines } from './useDraftStocktakeLines';

interface useStocktakeLineEditController {
  draftLines: DraftStocktakeLine[];
  update: (patch: RecordPatch<StocktakeLineFragment>) => void;
  mutableUpdate: (patch: RecordPatch<StocktakeLineFragment>) => void;
  addLine: () => void;
  save: (lines: DraftStocktakeLine[]) => Promise<UpsertStocktakeLinesMutation>;
  isLoading: boolean;
  nextItem: ItemRowFragment | null;
  isError: boolean;
}

export const useStocktakeLineEdit = (
  item: ItemRowFragment | null
): useStocktakeLineEditController => {
  const { id } = useStocktake.document.fields('id');
  const nextItem = useNextItem(item?.id);
  const [draftLines, setDraftLines] = useDraftStocktakeLines(item);
  const { mutateAsync: save, isLoading, isError } = useStocktake.line.save();

  const update = (patch: RecordPatch<DraftStocktakeLine>) => {
    setDraftLines(lines =>
      ArrayUtils.immutablePatch(lines, {
        ...patch,
        isUpdated: !patch.isCreated,
      })
    );
  };

  const mutableUpdate = (patch: RecordPatch<DraftStocktakeLine>) => {
    setDraftLines(lines =>
      ArrayUtils.mutablePatch(lines, {
        ...patch,
        isUpdated: !patch.isCreated,
      })
    );
  };

  const addLine = () => {
    if (item) {
      setDraftLines(lines => [...lines, DraftLine.fromItem(id, item)]);
    }
  };

  return {
    draftLines,
    update,
    mutableUpdate,
    addLine,
    save,
    isError,
    isLoading,
    nextItem,
  };
};
