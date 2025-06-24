import React from 'react';
import {
  DialogButton,
  LoadingButton,
  SaveIcon,
  useDialog,
  useTranslation,
} from '@openmsupply-client/common';
import { DraftClinician } from '.';
import { CreateClinicianForm } from './CreateClinicianForm';

interface CreateClinicianModalProps {
  draft: DraftClinician;
  updateDraft: (update: Partial<DraftClinician>) => void;
  open: boolean;
  onClose: (clinicianId?: string) => void;
  confirmAndSave?: () => void;
  isSaving?: boolean;
  isValid?: boolean;
}

export const CreateClinicianModal = ({
  draft,
  updateDraft,
  open,
  onClose,
  confirmAndSave = () => {},
  isSaving = false,
  isValid = true,
}: CreateClinicianModalProps) => {
  const t = useTranslation();

  const { Modal } = useDialog({
    isOpen: open,
    onClose,
    disableBackdrop: true,
    disableMobileFullScreen: true, // modal not big enough to warrant full screen on mobile
  });

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
      cancelButton={<DialogButton variant="cancel" onClick={() => onClose()} />}
    >
      <CreateClinicianForm
        draft={draft}
        updateDraft={updateDraft}
        width={350}
      />
    </Modal>
  );
};
