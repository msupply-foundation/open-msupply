import React, { useState } from 'react';
import {
  DetailContainer,
  DetailSection,
  Box,
  TabContext,
  DialogButton,
  WizardStepper,
  useTranslation,
  BasicSpinner,
  SlidePanel,
} from '@openmsupply-client/common';
import { PatientFormTab } from './PatientFormTab';
import { PatientResultsTab } from './PatientResultsTab';
import { CreateNewPatient } from '@openmsupply-client/programs';
import { useCreatePatientForm } from './useCreatePatientForm';

enum Tabs {
  Form = 'Form',
  SearchResults = 'SearchResults',
}

interface CreatePatientSliderProps {
  open: boolean;
  onClose: () => void;
  onCreatePatient: (newPatient: CreateNewPatient) => void;
  onSelectPatient: (selectedPatient: string) => void;
}

export const CreatePatientSlider = ({
  open,
  onClose,
  onCreatePatient: onCreate,
  onSelectPatient: onSelect,
}: CreatePatientSliderProps) => {
  const t = useTranslation();

  const [hasError, setHasError] = useState(false);

  const {
    currentTab,
    onNext,
    onChangeTab,
    clear,
    isLoading,
    createNewPatient,
    onOk,
  } = useCreatePatientForm(onCreate, Tabs);

  const patientSteps = [
    {
      description: '',
      label: t('label.patient-details'),
      tab: Tabs.Form,
    },
    {
      description: '',
      label: t('label.search-results'),
      tab: Tabs.SearchResults,
    },
  ];

  const getActiveStep = () => {
    const step = patientSteps.find(step => step.tab === currentTab);
    return step ? patientSteps.indexOf(step) : 0;
  };

  if (isLoading) return <BasicSpinner />;

  return (
    <SlidePanel
      title=""
      width={950}
      okButton={
        currentTab === Tabs.SearchResults ? (
          <DialogButton
            variant="next"
            onClick={() => {
              onOk();
              onClose();
            }}
            customLabel={t('button.create-new-patient')}
          />
        ) : (
          <DialogButton
            variant="next-and-ok"
            onClick={onNext}
            disabled={hasError}
          />
        )
      }
      cancelButton={
        <DialogButton
          variant="cancel"
          onClick={() => {
            clear();
            onClose();
          }}
        />
      }
      open={open}
      onClose={() => {
        onClose(), onChangeTab(Tabs.Form);
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
            <DetailSection title="">
              <PatientFormTab
                value={Tabs.Form}
                patient={createNewPatient}
                onChange={errors => {
                  setHasError((errors.errors?.length ?? 0) > 0);
                }}
              />
              <PatientResultsTab
                value={Tabs.SearchResults}
                patient={createNewPatient}
                active={currentTab === Tabs.SearchResults}
                onRowClick={selectedPatient => onSelect(selectedPatient)}
              />
            </DetailSection>
          </TabContext>
        </Box>
      </DetailContainer>
    </SlidePanel>
  );
};
