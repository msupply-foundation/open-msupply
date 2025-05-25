import { useEffect, useState } from 'react';
import { useResponse, ResponseLineFragment } from '../../api';
import {
  ItemRowFragment,
  ItemWithStatsFragment,
} from '@openmsupply-client/system';
import { useNotification } from '@common/hooks';

export type DraftResponseLine = Omit<ResponseLineFragment, '__typename'> & {
  requisitionId: string;
};

const createDraftLine = (
  line: ResponseLineFragment,
  requisitionId: string
): DraftResponseLine => ({
  ...line,
  requisitionId,
  itemId: line.item.id,
  requestedQuantity: line.requestedQuantity,
  supplyQuantity: line.supplyQuantity,
});

export const useDraftRequisitionLine = (item?: ItemRowFragment | null) => {
  const { id: reqId, lines } = useResponse.document.fields(['id', 'lines']);
  const { mutateAsync: saveAction, isLoading } = useResponse.line.save();
  const { error } = useNotification();

  const [draft, setDraft] = useState<DraftResponseLine | null>(null);

  useEffect(() => {
    if (lines && item && reqId) {
      const existingLine = lines.nodes.find(
        ({ item: reqItem }) => reqItem.id === item.id
      );
      if (existingLine) {
        if (draft && draft.id === existingLine.id) {
          setDraft(draft);
        } else {
          setDraft(createDraftLine(existingLine, reqId));
        }
      }
    } else {
      setDraft(null);
    }
  }, [lines, item, reqId, draft]);

  const update = (patch: Partial<DraftResponseLine>) => {
    if (draft) {
      setDraft({ ...draft, ...patch });
    }
  };

  const save = async () => {
    if (draft) {
      const result = await saveAction(draft);
      if (
        result.updateResponseRequisitionLine.__typename ===
        'UpdateResponseRequisitionLineError'
      ) {
        switch (result.updateResponseRequisitionLine.error.__typename) {
          default:
            error(result.updateResponseRequisitionLine.error.description)();
            break;
        }
      }
    }
  };

  return { draft, isLoading, save, update };
};

export const useNextResponseLine = (
  currentItem?: ItemWithStatsFragment | null
) => {
  const { lines } = useResponse.line.list();

  const nextState: {
    hasNext: boolean;
    next: ItemWithStatsFragment | null;
  } = { hasNext: true, next: null };
  const idx = lines.findIndex(l => l.item.id === currentItem?.id);
  const next = lines[idx + 1];

  if (!next) {
    nextState.hasNext = false;
    return nextState;
  }

  nextState.next = next.item;

  return nextState;
};
