import React, { FC, useEffect, useState } from 'react';
import {
  DetailContainer,
  DetailSection,
  Box,
  FnUtils,
  DocumentRegistryNodeContext,
  TabContext,
  useTabs,
  DialogButton,
  useNavigate,
  useDialog,
  WizardStepper,
  useTranslation,
  useDebounceCallback,
} from '@openmsupply-client/common';
import { PatientFormTab } from './PatientFormTab';
import { PatientResultsTab } from './PatientResultsTab';
import {
  CreateNewPatient,
  usePatientCreateStore,
  DocumentRegistryFragment,
  useDocumentRegistry,
} from '@openmsupply-client/programs';

enum Tabs {
  Form = 'Form',
  SearchResults = 'SearchResults',
}

interface CreatePatientModal {
  onClose: () => void;
}

const newPatient = (
  documentRegistry: DocumentRegistryFragment
): CreateNewPatient => {
  return {
    id: FnUtils.generateUUID(),
    documentRegistry,
  };
};

export const CreatePatientModal: FC<CreatePatientModal> = ({ onClose }) => {
  const { data: documentRegistryResponse } =
    useDocumentRegistry.get.documentRegistryByContext(
      DocumentRegistryNodeContext.Patient
    );
  const [documentRegistry, setDocumentRegistry] = useState<
    DocumentRegistryFragment | undefined
  >();
  const { currentTab, onChangeTab } = useTabs(Tabs.Form);
  const { Modal, showDialog, hideDialog } = useDialog({
    onClose,
    disableBackdrop: true,
  });
  const navigate = useNavigate();
  const { patient, setNewPatient, updatePatient } = usePatientCreateStore();
  const t = useTranslation('patients');

  const onNext = useDebounceCallback(() => {
    updatePatient({ canSearch: true });
    onChangeTab(Tabs.SearchResults);
  }, []);

  const onOk = () => {
    if (patient) {
      navigate(patient.id);
    }
  };

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
    if (documentRegistryResponse?.[0]) {
      setDocumentRegistry(documentRegistryResponse?.[0]);
    }
  }, [documentRegistryResponse]);

  useEffect(() => {
    // always show the dialog when we are mounted
    showDialog();
    // clean up when we are unmounting
    return () => {
      hideDialog();
      onChangeTab(Tabs.Form);
    };
  }, []);

  useEffect(() => {
    setNewPatient(documentRegistry ? newPatient(documentRegistry) : undefined);
  }, [documentRegistry]);

  if (documentRegistry === undefined) {
    return null;
  }
  return (
    <Modal
      title=""
      sx={{ maxWidth: '90%' }}
      okButton={
        currentTab === Tabs.SearchResults ? (
          <DialogButton
            variant="next"
            disabled={!patient?.canCreate}
            onClick={onOk}
          />
        ) : undefined
      }
      nextButton={
        currentTab !== Tabs.SearchResults ? (
          <DialogButton variant="next" onClick={onNext} />
        ) : undefined
      }
      cancelButton={
        <DialogButton
          variant="cancel"
          onClick={() => {
            setNewPatient(undefined);
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
              <PatientFormTab value={Tabs.Form} patient={patient} />
              <PatientResultsTab value={Tabs.SearchResults} patient={patient} />
            </DetailSection>
          </TabContext>
        </Box>
      </DetailContainer>
    </Modal>
  );
};
