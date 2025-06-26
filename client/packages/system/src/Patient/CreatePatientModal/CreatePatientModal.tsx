import React, { useEffect, useState } from 'react';
import {
  DetailContainer,
  DetailSection,
  Box,
  TabContext,
  DialogButton,
  useDialog,
  WizardStepper,
  useTranslation,
  BasicSpinner,
} from '@openmsupply-client/common';
import { PatientFormTab } from './PatientFormTab';
import { PatientResultsTab } from './PatientResultsTab';
import { CreateNewPatient } from '@openmsupply-client/programs';
import { useCreatePatientForm } from './useCreatePatientForm';

enum Tabs {
  Form = 'Form',
  SearchResults = 'SearchResults',
}

interface CreatePatientModal {
  onClose: () => void;
  onCreatePatient: (newPatient: CreateNewPatient) => void;
  onSelectPatient: (selectedPatient: string) => void;
}

export const CreatePatientModal = ({
  onClose,
  onCreatePatient: onCreate,
  onSelectPatient: onSelect,
}: CreatePatientModal) => {
  const t = useTranslation();
  const { Modal, showDialog, hideDialog } = useDialog({
    onClose,
  });
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

  useEffect(() => {
    // always show the dialog when we are mounted
    showDialog();
    // clean up when we are unmounting
    return () => {
      hideDialog();
      onChangeTab(Tabs.Form);
    };
  }, [hideDialog, onChangeTab, showDialog]);

  if (isLoading) return <BasicSpinner />;

  return (
    <Modal
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
        ) : undefined
      }
      nextButton={
        currentTab !== Tabs.SearchResults ? (
          <DialogButton
            variant="next-and-ok"
            onClick={onNext}
            disabled={hasError}
          />
        ) : undefined
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
    </Modal>
  );
};
