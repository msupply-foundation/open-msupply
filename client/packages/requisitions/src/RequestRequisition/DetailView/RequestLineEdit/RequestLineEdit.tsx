import React, { useState, useEffect } from 'react';
import {
  ModalMode,
  useDialog,
  DialogButton,
  BasicSpinner,
  useBufferState,
  generateUUID,
} from '@openmsupply-client/common';
import { RequestLineEditForm } from './RequestLineEditForm';
import {
  useSaveRequestLines,
  useRequestRequisitionFields,
  useRequestRequisitionLines,
  useIsRequestRequisitionDisabled,
  RequestRequisitionLineFragment,
  ItemWithStatsFragment,
} from '../../api';

export type DraftRequestRequisitionLine = Omit<
  RequestRequisitionLineFragment,
  '__typename' | 'item' | 'itemStats'
> & {
  isCreated: boolean;
  requisitionId: string;
};

interface RequestLineEditProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ModalMode | null;
  item: ItemWithStatsFragment | null;
}

const createDraftFromItem = (
  item: ItemWithStatsFragment,
  requisitionId: string
): DraftRequestRequisitionLine => {
  const { stats } = item;
  const { averageMonthlyConsumption, availableStockOnHand } = stats;

  // TODO: Use months of stock from what has been set on the requisition,
  // not this arbitrary 3.
  const suggested = averageMonthlyConsumption * 3 - availableStockOnHand;
  const suggestedQuantity = Math.max(suggested, 0);
  return {
    id: generateUUID(),
    requisitionId,
    itemId: item.id,
    requestedQuantity: suggestedQuantity,
    suggestedQuantity,
    isCreated: true,
  };
};

const createDraftFromRequestLine = (
  line: RequestRequisitionLineFragment,
  id: string
): DraftRequestRequisitionLine => ({
  ...line,
  requisitionId: id,
  itemId: line.item.id,
  requestedQuantity: line.requestedQuantity ?? line.suggestedQuantity,
  suggestedQuantity: line.suggestedQuantity,
  isCreated: false,
});

const useDraftRequisitionLine = (item: ItemWithStatsFragment | null) => {
  const { lines } = useRequestRequisitionLines();
  const { id: reqId } = useRequestRequisitionFields('id');
  const { mutate: save, isLoading } = useSaveRequestLines();

  const [draft, setDraft] = useState<DraftRequestRequisitionLine | null>(null);

  useEffect(() => {
    if (lines && item) {
      const existingLine = lines.find(
        ({ item: reqItem }) => reqItem.id === item.id
      );
      if (existingLine) {
        setDraft(createDraftFromRequestLine(existingLine, reqId));
      } else {
        setDraft(createDraftFromItem(item, reqId));
      }
    } else {
      setDraft(null);
    }
  }, [lines, item, reqId]);

  const update = (patch: Partial<DraftRequestRequisitionLine>) => {
    if (draft) {
      setDraft({ ...draft, ...patch });
    }
  };

  return { draft, isLoading, save: () => draft && save(draft), update };
};

export const RequestLineEdit = ({
  isOpen,
  onClose,
  mode,
  item,
}: RequestLineEditProps) => {
  const isDisabled = useIsRequestRequisitionDisabled();
  const { Modal } = useDialog({ onClose, isOpen });
  const [currentItem, setCurrentItem] = useBufferState(item);
  const { draft, isLoading, save, update } =
    useDraftRequisitionLine(currentItem);

  return (
    <Modal
      title={''}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      nextButton={<DialogButton variant="next" onClick={() => {}} />}
      okButton={
        <DialogButton
          variant="ok"
          onClick={async () => {
            await save();
            onClose();
          }}
        />
      }
      height={600}
      width={1024}
    >
      {!isLoading ? (
        <RequestLineEditForm
          draftLine={draft}
          update={update}
          disabled={mode === ModalMode.Update || isDisabled}
          onChangeItem={setCurrentItem}
          item={currentItem}
        />
      ) : (
        <BasicSpinner />
      )}
    </Modal>
  );
};
