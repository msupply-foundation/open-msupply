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
  useDocument,
  DocumentRegistryFragment,
} from '@openmsupply-client/common';
import { PatientFormTab } from './PatientFormTab';
import { PatientResultsTab } from './PatientResultsTab';
import { CreateNewPatient, useCreatePatientStore } from '../hooks';

enum Tabs {
  Form = 'Form',
  SearchResults = 'SearchResults',
}

interface CreatePatientModal {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const newPatient = (
  documentRegistry: DocumentRegistryFragment
): CreateNewPatient => {
  return {
    id: FnUtils.generateUUID(),
    documentRegistry,
  };
};

export const CreatePatientModal: FC<CreatePatientModal> = ({
  open,
  setOpen,
}) => {
  const { data: documentRegistryResponse } = useDocument.get.documentRegistry(
    DocumentRegistryNodeContext.Patient,
    open
  );
  const [documentRegistry, setDocumentRegistry] = useState<
    DocumentRegistryFragment | undefined
  >();
  const { currentTab, onChangeTab } = useTabs(Tabs.Form);
  const { Modal, showDialog, hideDialog } = useDialog({
    onClose: () => setOpen(false),
  });
  const navigate = useNavigate();
  const { patient, setNewPatient, updatePatient } = useCreatePatientStore();
  const t = useTranslation('patients');

  const onNext = () => {
    updatePatient({ canSearch: true });
    onChangeTab(Tabs.SearchResults);
  };

  const onOk = () => {
    hideDialog();
    if (patient) {
      navigate(patient.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      switch (currentTab) {
        case Tabs.Form:
          onNext();
          break;
        case Tabs.SearchResults:
          onOk();
          break;
      }
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
    if (open) showDialog();
    else {
      hideDialog();
      onChangeTab(Tabs.Form);
      setNewPatient(undefined);
    }
  }, [open]);

  useEffect(() => {
    setNewPatient(documentRegistry ? newPatient(documentRegistry) : undefined);
    // clear old patient
    return () => setNewPatient(undefined);
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
            variant="ok"
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
        <DialogButton variant="cancel" onClick={() => setOpen(false)} />
      }
      slideAnimation={false}
    >
      <DetailContainer>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          gap={2}
          onKeyDown={handleKeyDown}
        >
          <WizardStepper activeStep={getActiveStep()} steps={patientSteps} />
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
