import React, { useEffect, useState } from 'react';
import {
  DetailContainer,
  DetailSection,
  Box,
  FnUtils,
  TabContext,
  useTabs,
  DialogButton,
  useDialog,
  WizardStepper,
  useTranslation,
  useDebounceCallback,
  DocumentRegistryCategoryNode,
} from '@openmsupply-client/common';
import { PatientFormTab } from './PatientFormTab';
import { PatientResultsTab } from './PatientResultsTab';
import {
  CreateNewPatient,
  DocumentRegistryFragment,
  useDocumentRegistry,
  usePatientStore,
} from '@openmsupply-client/programs';

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
  const { data: documentRegistryResponse, isLoading } =
    useDocumentRegistry.get.documentRegistries({
      filter: { category: { equalTo: DocumentRegistryCategoryNode.Patient } },
    });
  const [hasError, setHasError] = useState(false);
  const [, setDocumentRegistry] = useState<
    DocumentRegistryFragment | undefined
  >();
  const { currentTab, onChangeTab } = useTabs(Tabs.Form);
  const { Modal, showDialog, hideDialog } = useDialog({
    onClose,
  });
  const t = useTranslation();
  const { createNewPatient, setCreateNewPatient } = usePatientStore();

  const onNext = useDebounceCallback(() => {
    onChangeTab(Tabs.SearchResults);
  }, []);

  const onOk = () => {
    if (!createNewPatient) return;
    onCreate(createNewPatient);
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
    if (documentRegistryResponse?.nodes?.[0]) {
      setDocumentRegistry(documentRegistryResponse.nodes?.[0]);
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
  }, [hideDialog, onChangeTab, showDialog]);

  useEffect(() => {
    setCreateNewPatient({
      id: FnUtils.generateUUID(),
    });
  }, [setCreateNewPatient]);

  if (isLoading) {
    return null;
  }
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
