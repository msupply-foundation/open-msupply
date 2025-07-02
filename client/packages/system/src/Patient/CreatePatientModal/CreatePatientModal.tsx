import React, { useEffect } from 'react';
import {
  DetailContainer,
  Box,
  TabContext,
  DialogButton,
  useDialog,
  useTranslation,
  BasicSpinner,
  DetailTab,
  SaveIcon,
  LoadingButton,
  WizardStepper,
  FnUtils,
} from '@openmsupply-client/common';
import { PatientColumnData } from './PatientResultsTab';
import { Tabs, useCreatePatientForm } from './useCreatePatientForm';

interface CreatePatientModal {
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
  onSelectPatient: (selectedPatient: PatientColumnData) => void;
}

export const CreatePatientModal = ({
  open,
  onClose,
  onCreate,
  onSelectPatient: onSelect,
}: CreatePatientModal) => {
  const t = useTranslation();

  const { Modal } = useDialog({ isOpen: open, onClose });

  const {
    onNext,
    tabs,
    currentTab,
    isSaving,
    hasError,
    setCurrentTab,
    setCreateNewPatient,
    isLoading,
    patientSteps,
    getActiveStep,
    handleSave,
  } = useCreatePatientForm(onSelect);

  useEffect(() => {
    if (open) {
      setCreateNewPatient({
        id: FnUtils.generateUUID(),
      });
    }
  }, [open, setCreateNewPatient]);

  if (isLoading) return <BasicSpinner />;

  return (
    <Modal
      title=""
      width={950}
      okButton={
        currentTab === Tabs.Patient ? (
          <LoadingButton
            color="secondary"
            label={t('button.save')}
            startIcon={<SaveIcon />}
            onClick={() => {
              handleSave();
              onCreate();
            }}
            isLoading={isSaving}
          />
        ) : (
          <DialogButton
            variant="next-and-ok"
            onClick={() => onNext(tabs)}
            disabled={hasError}
          />
        )
      }
      cancelButton={
        <DialogButton
          variant="cancel"
          onClick={() => {
            setCurrentTab(Tabs.Form);
            setCreateNewPatient(undefined);
            onClose();
          }}
        />
      }
      slideAnimation={false}
    >
      <DetailContainer>
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <WizardStepper
            activeStep={getActiveStep()}
            steps={patientSteps}
            nowrap
          />
          <TabContext value={currentTab}>
            {tabs.map(({ Component, value }) => (
              <DetailTab value={value} key={value}>
                {Component}
              </DetailTab>
            ))}
          </TabContext>
        </Box>
      </DetailContainer>
    </Modal>
  );
};
