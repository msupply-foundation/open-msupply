import React from 'react';
import {
  DialogButton,
  LoadingButton,
  SaveIcon,
  SlidePanel,
  useTranslation,
} from '@openmsupply-client/common';
import { DraftClinician } from '.';
import { CreateClinicianForm } from './CreateClinicianForm';

interface CreateClinicianSliderProps {
  draft: DraftClinician;
  updateDraft: (update: Partial<DraftClinician>) => void;
  open: boolean;
  onClose: (clinicianId?: string) => void;
  width?: number | string;
  confirmAndSave?: () => void;
  isSaving?: boolean;
  isValid?: boolean;
}

export const CreateClinicianSlider = ({
  draft,
  updateDraft,
  open,
  onClose,
  width = '100%',
  confirmAndSave = () => {},
  isSaving = false,
  isValid = true,
}: CreateClinicianSliderProps) => {
  const t = useTranslation();

  return (
    <SlidePanel
      title={t('label.create-clinician')}
      open={open}
      width={width}
      onClose={() => onClose()}
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
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <CreateClinicianForm draft={draft} updateDraft={updateDraft} />
      </div>
    </SlidePanel>
  );
};
