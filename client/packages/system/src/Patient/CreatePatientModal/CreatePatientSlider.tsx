import React from 'react';
import {
  DetailContainer,
  Box,
  TabContext,
  DialogButton,
  useTranslation,
  BasicSpinner,
  SlidePanel,
  DetailTab,
  LoadingButton,
  SaveIcon,
  WizardStepper,
} from '@openmsupply-client/common';
import { Tabs, useCreatePatientForm } from './useCreatePatientForm';
import { PatientColumnData } from './PatientResultsTab';

interface CreatePatientSliderProps {
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
  onSelectPatient: (selectedPatient: PatientColumnData) => void;
}

export const CreatePatientSlider = ({
  open,
  onClose,
  onCreate,
  onSelectPatient: onSelect,
}: CreatePatientSliderProps) => {
  const t = useTranslation();

  const {
    onNext,
    tabs,
    currentTab,
    isSaving,
    hasError,
    setCurrentTab,
    setCreateNewPatient,
    patientSteps,
    getActiveStep,
    isLoading,
    handleSave,
  } = useCreatePatientForm(onSelect);

  if (isLoading) return <BasicSpinner />;

  return (
    <SlidePanel
      title=""
      width={1180}
      open={open}
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
      onClose={() => {
        onClose(), setCurrentTab(Tabs.Form);
      }}
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
    </SlidePanel>
  );
};
