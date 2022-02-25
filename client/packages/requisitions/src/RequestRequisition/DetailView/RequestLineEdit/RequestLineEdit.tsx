import React from 'react';
import {
  ModalMode,
  useDialog,
  DialogButton,
  BasicSpinner,
  useBufferState,
} from '@openmsupply-client/common';
import { RequestLineEditForm } from './RequestLineEditForm';
import {
  useIsRequestRequisitionDisabled,
  ItemWithStatsFragment,
} from '../../api';
import { useDraftRequisitionLine } from './hooks';

interface RequestLineEditProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ModalMode | null;
  item: ItemWithStatsFragment | null;
}

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
      contentProps={{ sx: { padding: 0 } }}
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
