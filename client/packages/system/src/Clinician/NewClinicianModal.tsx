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
import { useCreateClinician } from './useCreateClinician';

interface NewClinicianModalProps {
  open: boolean;
  onClose: () => void;
}

export const NewClinicianModal = ({
  open,
  onClose,
}: NewClinicianModalProps) => {
  const t = useTranslation();
  const { error, success } = useNotification();

  const { draft, updateDraft, isValid, save } = useCreateClinician();

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
      await save();
      success(t('messages.created-clinician'))();
      handleClose();
    } catch (e) {
      const errorSnack = error((e as Error).message);
      errorSnack();
    }
  };

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
          disabled={!isValid}
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
              value={draft.code}
              onChange={event => updateDraft({ code: event.target.value })}
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
              value={draft.firstName}
              onChange={event => updateDraft({ firstName: event.target.value })}
            />
          }
        />
        <InputWithLabelRow
          label={t('label.last-name')}
          Input={
            <BasicTextInput
              size="small"
              sx={{ width: 350 }}
              value={draft.lastName}
              onChange={event => updateDraft({ lastName: event.target.value })}
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
              value={draft.initials}
              onChange={event => updateDraft({ initials: event.target.value })}
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
