import { RecordPatch, ArrayUtils } from '@openmsupply-client/common';
import { ItemRowFragment } from '@openmsupply-client/system';
import { StocktakeLineFragment, useStocktake } from './../../../../api';
import { DraftStocktakeLine, DraftLine } from '../utils';
import { useNextItem } from './useNextItem';
import { useDraftStocktakeLines } from './useDraftStocktakeLines';

interface useStocktakeLineEditController {
  draftLines: DraftStocktakeLine[];
  update: (patch: RecordPatch<StocktakeLineFragment>) => void;
  addLine: () => void;
  save: (lines: DraftStocktakeLine[]) => void;
  isLoading: boolean;
  nextItem: ItemRowFragment | null;
}

export const useStocktakeLineEdit = (
  item: ItemRowFragment | null
): useStocktakeLineEditController => {
  const { id } = useStocktake.document.fields('id');
  const nextItem = useNextItem(item?.id);
  const [draftLines, setDraftLines] = useDraftStocktakeLines(item);
  const { mutate: save, isLoading } = useStocktake.line.save();

  const update = (patch: RecordPatch<DraftStocktakeLine>) => {
    setDraftLines(lines =>
      ArrayUtils.immutablePatch(lines, {
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

  return { draftLines, update, addLine, save, isLoading, nextItem };
};
