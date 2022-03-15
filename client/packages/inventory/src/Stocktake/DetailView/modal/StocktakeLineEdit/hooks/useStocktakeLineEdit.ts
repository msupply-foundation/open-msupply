import { RecordPatch } from '@openmsupply-client/common';
import { ItemRowFragment } from '@openmsupply-client/system';
import {
  StocktakeLineFragment,
  useStocktakeFields,
  useSaveStocktakeLines,
} from './../../../../api';
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
  const { id } = useStocktakeFields('id');
  const nextItem = useNextItem(item?.id);
  const [draftLines, setDraftLines] = useDraftStocktakeLines(item);
  const { mutate: save, isLoading } = useSaveStocktakeLines();

  const update = (patch: RecordPatch<StocktakeLineFragment>) => {
    setDraftLines(lines => {
      return lines.map(line => {
        if (line.id === patch.id) {
          return {
            ...line,
            ...patch,
            isUpdated: !line.isCreated,
          };
        }
        return line;
      });
    });
  };

  const addLine = () => {
    if (item) {
      setDraftLines(lines => [...lines, DraftLine.fromItem(id, item)]);
    }
  };

  return { draftLines, update, addLine, save, isLoading, nextItem };
};
