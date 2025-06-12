import React from 'react';
import {
  BasicTextInput,
  DialogButton,
  InputWithLabelRow,
  LoadingButton,
  SaveIcon,
  Stack,
  useDialog,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';

interface NewClinicianModalProps {
  open: boolean;
  onClose: () => void;
}

export const NewClinicianModal = ({
  open,
  onClose,
}: NewClinicianModalProps) => {
  const t = useTranslation();
  const { error } = useNotification();

  const { Modal } = useDialog({
    isOpen: open,
    onClose,
    disableBackdrop: true,
    isSidePanelModal: true,
  });

  const handleClose = () => {
    onClose();
  };

  const handleSave = async () => {
    try {
      handleClose();
    } catch (e) {
      const errorSnack = error(
        t('error.failed-to-create-prescription') + (e as Error).message
      );
      errorSnack();
    }
  };

  // const canSave = patient && date;

  return (
    <Modal
      title={t('label.create-clinician')}
      okButton={
        <LoadingButton
          color="secondary"
          variant="contained"
          startIcon={<SaveIcon />}
          label={t('label.create')}
          isLoading={false} // Replace with actual loading state if needed
          // isLoading={isCreating}
          onClick={handleSave}
          // disabled={!canSave}
        />
      }
      cancelButton={<DialogButton variant="cancel" onClick={handleClose} />}
    >
      <Stack gap={2}>
        <InputWithLabelRow
          label={t('label.code')}
          Input={
            <BasicTextInput
              size="small"
              sx={{ width: 350 }}
              value={''}
              onChange={event => console.log(event.target.value)}
              required
            />
          }
        />
        <InputWithLabelRow
          label={t('label.first-name')}
          Input={
            <BasicTextInput
              size="small"
              sx={{ width: 350 }}
              value={''}
              onChange={event => console.log(event.target.value)}
            />
          }
        />
        <InputWithLabelRow
          label={t('label.last-name')}
          Input={
            <BasicTextInput
              size="small"
              sx={{ width: 350 }}
              value={''}
              onChange={event => console.log(event.target.value)}
              required
            />
          }
        />
        <InputWithLabelRow
          label={t('label.initials')}
          Input={
            <BasicTextInput
              size="small"
              sx={{ width: 350 }}
              value={''}
              onChange={event => console.log(event.target.value)}
              required
            />
          }
        />
        {/* <InputWithLabelRow
          label={t('label.gender')}
          Input={<Select options={GenderType.} />}
        /> */}
      </Stack>
    </Modal>
  );
};
