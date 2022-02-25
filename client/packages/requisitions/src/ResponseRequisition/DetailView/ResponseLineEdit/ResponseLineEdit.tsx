import React from 'react';
import {
  useDialog,
  DialogButton,
  BasicSpinner,
} from '@openmsupply-client/common';
import { ResponseLineEditForm } from './ResponseLineEditForm';
import {
  useIsResponseRequisitionDisabled,
  ResponseRequisitionLineFragment,
} from '../../api';
import { useDraftRequisitionLine } from './hooks';

interface ResponseLineEditProps {
  isOpen: boolean;
  onClose: () => void;
  line: ResponseRequisitionLineFragment;
}

export const ResponseLineEdit = ({
  isOpen,
  onClose,
  line,
}: ResponseLineEditProps) => {
  const isDisabled = useIsResponseRequisitionDisabled();
  const { Modal } = useDialog({ onClose, isOpen });
  const { draft, isLoading, save, update } = useDraftRequisitionLine(line);

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
        <ResponseLineEditForm
          draftLine={draft}
          update={update}
          disabled={isDisabled}
        />
      ) : (
        <BasicSpinner />
      )}
    </Modal>
  );
};
