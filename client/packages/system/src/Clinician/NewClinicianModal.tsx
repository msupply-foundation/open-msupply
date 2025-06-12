import React from 'react';
import {
  BasicTextInput,
  DialogButton,
  InputWithLabelRow,
  LoadingButton,
  SaveIcon,
  Stack,
  useConfirmationModal,
  useDialog,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { useCreateClinician } from './useCreateClinician';

interface NewClinicianModalProps {
  asSidePanel: boolean;
  open: boolean;
  onClose: (clinicianId?: string) => void;
  codeExists: (code: string) => boolean;
}

export const NewClinicianModal = ({
  asSidePanel,
  open,
  onClose,
  codeExists,
}: NewClinicianModalProps) => {
  const t = useTranslation();
  const { error, success } = useNotification();

  const { isSaving, draft, updateDraft, isValid, save, clear } =
    useCreateClinician();

  const { Modal } = useDialog({
    isOpen: open,
    onClose,
    disableBackdrop: true,
    disableMobileFullScreen: true, // modal not big enough to warrant full screen on mobile
    isSidePanelModal: asSidePanel,
  });

  const handleClose = (clinicianId?: string) => {
    onClose(clinicianId);
    clear();
  };

  const handleSave = async () => {
    try {
      const result = await save();
      success(t('messages.created-clinician'))();
      handleClose(result.id);
    } catch (e) {
      const errorSnack = error((e as Error).message);
      errorSnack();
    }
  };

  const confirm = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.clinician-code-already-exists'),
    onConfirm: handleSave,
  });

  const confirmAndSave = () => {
    if (codeExists(draft.code)) {
      confirm();
    } else {
      handleSave();
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
          isLoading={isSaving}
          onClick={confirmAndSave}
          disabled={!isValid}
        />
      }
      cancelButton={
        <DialogButton variant="cancel" onClick={() => handleClose()} />
      }
    >
      <Stack gap={2} margin="0 auto" width="500px">
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
