import React, { useState } from 'react';
import {
  BasicSpinner,
  DialogButton,
  NothingHere,
  useDialog,
  useTranslation,
} from '@openmsupply-client/common';
import { RequestFragment, useRequest } from '../../api';
import { useDraftRequisitionLine, usePreviousNextRequestLine } from './hooks';
import { RequestLineEdit } from './RequestLineEdit';

interface ModalContentProps {
  itemId?: string | null;
  requisition: RequestFragment;
  isOpen: boolean;
  onClose: () => void;
}

export const ModalContent = ({
  itemId,
  requisition,
  isOpen,
  onClose,
}: ModalContentProps) => {
  const t = useTranslation();
  const { Modal } = useDialog({ isOpen, onClose });

  const lines = requisition.lines.nodes.sort((a, b) =>
    a.item.name.localeCompare(b.item.name)
  );

  const [currentItem, setCurrentItem] = useState(
    lines.find(line => line.item.id === itemId)?.item
  );
  const { draft, save, update } = useDraftRequisitionLine(currentItem);

  const { hasNext, next, previous } = usePreviousNextRequestLine(
    lines,
    currentItem
  );

  const isNew = !draft?.id;
  const isProgram = !!requisition.programName;
  const isDisabled = requisition.status !== 'DRAFT';

  const handleOkClick = async () => {
    await save();
    onClose();
  };

  const handleNextClick = () => {
    if (next) {
      const nextItem = lines.find(line => line.item.id === next.id)?.item;
      setCurrentItem(nextItem);
    }
  };

  return (
    <Modal
      width={700}
      title={isNew ? t('title.new-item') : t('title.edit-item')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={<DialogButton variant="save" onClick={handleOkClick} />}
      nextButton={
        <DialogButton
          disabled={!hasNext}
          variant="next-and-ok"
          onClick={handleNextClick}
        />
      }
      slideAnimation={false}
      fullscreen={false}
    >
      <RequestLineEdit
        item={currentItem}
        draft={draft}
        update={update}
        previous={previous}
        isProgram={isProgram}
        setCurrentItem={setCurrentItem}
        requisition={requisition}
        lines={lines}
        disabled={isDisabled}
      />
    </Modal>
  );
};

interface RequestLineEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string | null;
}

export const RequestLineEditModal = ({
  isOpen,
  onClose,
  itemId,
}: RequestLineEditModalProps) => {
  const { data, isLoading } = useRequest.document.get();

  if (isLoading) return <BasicSpinner />;
  if (!data) return <NothingHere />;

  return (
    <ModalContent
      requisition={data}
      itemId={itemId}
      isOpen={isOpen}
      onClose={onClose}
    />
  );
};
