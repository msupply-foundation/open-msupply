import React from 'react';
import {
  ButtonWithIcon,
  useTranslation,
  PlusCircleIcon,
  useDialog,
  DialogButton,
  useNotification,
} from '@openmsupply-client/common';

export const UpdateStatusButtonComponent = () => {
  const t = useTranslation('coldchain');
  const { Modal, hideDialog, showDialog } = useDialog();
  const { success } = useNotification();
  const save = () => {
    success(t('messages.log-saved-successfully'))();
  };

  return (
    <>
      <Modal
        title="Add Item"
        cancelButton={<DialogButton variant="cancel" onClick={hideDialog} />}
        okButton={<DialogButton variant="ok" onClick={save} />}
      >
        <div>Something here?</div>
      </Modal>
      <ButtonWithIcon
        disabled={true}
        Icon={<PlusCircleIcon />}
        label={t('button.update-status')}
        onClick={showDialog}
      />
    </>
  );
};

export const UpdateStatusButton = React.memo(UpdateStatusButtonComponent);
