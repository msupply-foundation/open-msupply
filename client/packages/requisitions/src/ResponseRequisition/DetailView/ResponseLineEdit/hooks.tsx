import { useEffect, useState } from 'react';
import { useResponse, ResponseLineFragment } from '../../api';

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

export const useDraftRequisitionLine = (line: ResponseLineFragment) => {
  const { id: reqId } = useResponse.document.fields('id');
  const { mutate: save, isLoading } = useResponse.line.save();

  const [draft, setDraft] = useState<DraftResponseLine>(
    createDraftLine(line, reqId)
  );

  useEffect(() => {
    setDraft(createDraftLine(line, reqId));
  }, [line, reqId]);

  const update = (patch: Partial<DraftResponseLine>) => {
    if (draft) {
      setDraft({ ...draft, ...patch });
    }
  };

  return { draft, isLoading, save: () => draft && save(draft), update };
};

export const useNextResponseLine = (currentItem: ResponseLineFragment) => {
  const { lines } = useResponse.line.list();
  const nextState: {
    hasNext: boolean;
    next: null | ResponseLineFragment;
  } = { hasNext: true, next: null };

  const idx = lines.findIndex(l => l.id === currentItem.id);
  const next = lines[idx + 1];
  if (!next) {
    nextState.hasNext = false;
    return nextState;
  }

  nextState.next = next;

  return nextState;
};
