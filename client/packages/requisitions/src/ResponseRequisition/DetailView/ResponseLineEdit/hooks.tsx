import { useEffect, useState } from 'react';
import { useResponse, ResponseLineFragment } from '../../api';
import { ItemRowFragment } from '@openmsupply-client/system';
import { useNotification } from '@common/hooks';
import { useTranslation } from '@common/intl';

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
  const t = useTranslation();

  const [draft, setDraft] = useState<DraftResponseLine | null>(null);

  useEffect(() => {
    if (lines && item && reqId) {
      const existingLine = lines.nodes.find(
        ({ item: reqItem }) => reqItem.id === item.id
      );
      if (existingLine) {
        setDraft(createDraftLine(existingLine, reqId));
      }
    } else {
      setDraft(null);
    }
  }, [lines, item, reqId]);

  const update = (patch: Partial<DraftResponseLine>) => {
    if (draft) {
      setDraft({ ...draft, ...patch });
    }
  };

  const save = async () => {
    if (draft) {
      let result = await saveAction(draft);
      if (
        result.updateResponseRequisitionLine.__typename ===
        'UpdateResponseRequisitionLineError'
      ) {
        switch (result.updateResponseRequisitionLine.error.__typename) {
          case 'ReasonNotProvided':
            error(t('error.requires-reason'))();
            break;
          default:
            error(result.updateResponseRequisitionLine.error.description)();
            break;
        }
      }
    }
  };

  return { draft, isLoading, save, update };
};

export const usePreviousNextResponseLine = (
  lines?: ResponseLineFragment[],
  currentItem?: ItemRowFragment | null
) => {
  if (!lines) {
    return { hasNext: false, next: null, hasPrevious: false, previous: null };
  }

  const state: {
    hasPrevious: boolean;
    previous: null | ItemRowFragment;
    hasNext: boolean;
    next: null | ItemRowFragment;
  } = { hasNext: true, next: null, hasPrevious: true, previous: null };
  const idx = lines.findIndex(l => l.item.id === currentItem?.id);
  const previous = lines[idx - 1];
  const next = lines[idx + 1];

  if (!previous) {
    state.hasPrevious = false;
  } else {
    state.previous = previous.item;
  }

  if (!next) {
    state.hasNext = false;
  } else {
    state.next = next.item;
  }

  return state;
};
