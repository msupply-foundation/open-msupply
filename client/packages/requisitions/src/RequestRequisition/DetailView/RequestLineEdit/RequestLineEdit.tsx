import React, { useState, useEffect } from 'react';
import {
  ModalMode,
  useDialog,
  DialogButton,
  BasicSpinner,
  useBufferState,
  generateUUID,
} from '@openmsupply-client/common';
import { ItemRowFragment } from '@openmsupply-client/system';
import { RequestLineEditForm } from './RequestLineEditForm';
import {
  useSaveRequestLines,
  useRequestRequisitionFields,
  useRequestRequisitionLines,
  useIsRequestRequisitionDisabled,
  RequestRequisitionLineFragment,
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
  item: ItemRowFragment | null;
}

const createDraftRequestLine = (
  item: ItemRowFragment,
  id: string
): DraftRequestRequisitionLine => ({
  id: generateUUID(),
  requisitionId: id,
  itemId: item.id,
  requestedQuantity: 0,
  suggestedQuantity: 0,
  isCreated: true,
});

const useDraftRequisitionLine = (item: ItemRowFragment | null) => {
  const { lines } = useRequestRequisitionLines();
  const { id } = useRequestRequisitionFields('id');
  const { mutate: save, isLoading } = useSaveRequestLines();

  const [draft, setDraft] = useState<DraftRequestRequisitionLine | null>(null);

  useEffect(() => {
    if (lines && item) {
      const existingLine = lines.find(
        ({ item: reqItem }) => reqItem.id === item.id
      );
      if (existingLine)
        return setDraft({
          ...existingLine,
          isCreated: false,
          requisitionId: id,
        });
      else return setDraft(createDraftRequestLine(item, id));
    } else {
      setDraft(null);
    }
  }, [lines, item, id]);

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
      okButton={<DialogButton variant="ok" onClick={save} />}
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
