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
import { useNextRequestLine, useDraftRequisitionLine } from './hooks';

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
  const disabled = useIsRequestRequisitionDisabled();
  const { Modal } = useDialog({ onClose, isOpen });
  const [currentItem, setCurrentItem] = useBufferState(item);
  const { draft, isLoading, save, update } =
    useDraftRequisitionLine(currentItem);
  const { next, isDisabled } = useNextRequestLine(currentItem);

  return (
    <Modal
      title={''}
      contentProps={{ sx: { padding: 0 } }}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      nextButton={
        <DialogButton
          disabled={isDisabled || mode === ModalMode.Create}
          variant="next"
          onClick={() => {
            next && setCurrentItem(next);
            // Returning true here triggers the slide animation
            return true;
          }}
        />
      }
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
          disabled={mode === ModalMode.Update || disabled}
          onChangeItem={setCurrentItem}
          item={currentItem}
        />
      ) : (
        <BasicSpinner />
      )}
    </Modal>
  );
};
