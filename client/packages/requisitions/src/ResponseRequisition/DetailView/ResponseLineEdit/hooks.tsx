import { useState } from 'react';
import {
  useSaveResponseLines,
  useResponseRequisitionFields,
  ResponseRequisitionLineFragment,
} from '../../api';

export type DraftResponseLine = Omit<
  ResponseRequisitionLineFragment,
  '__typename'
> & {
  requisitionId: string;
};

const createDraftLine = (
  line: ResponseRequisitionLineFragment,
  requisitionId: string
): DraftResponseLine => ({
  ...line,
  requisitionId,
  itemId: line.item.id,
  requestedQuantity: line.requestedQuantity,
  supplyQuantity: line.supplyQuantity,
});

export const useDraftRequisitionLine = (
  line: ResponseRequisitionLineFragment
) => {
  const { id: reqId } = useResponseRequisitionFields('id');
  const { mutate: save, isLoading } = useSaveResponseLines();

  const [draft, setDraft] = useState<DraftResponseLine>(
    createDraftLine(line, reqId)
  );

  const update = (patch: Partial<DraftResponseLine>) => {
    if (draft) {
      setDraft({ ...draft, ...patch });
    }
  };

  return { draft, isLoading, save: () => draft && save(draft), update };
};
