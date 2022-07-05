import React, { FC, useEffect, useState } from 'react';
import {
  DetailContainer,
  DetailSection,
  Typography,
  Box,
  FnUtils,
  DocumentRegistryNodeContext,
  TabContext,
  Tab,
  TabList,
  useTabs,
  DialogButton,
  useNavigate,
  useDialog,
} from '@openmsupply-client/common';
import { CreateNewPatient, useCreatePatientStore } from '../hooks';
import { useDocumentRegistryByContext } from 'packages/common/src/ui/forms/JsonForms/api/hooks/document/useDocumentRegistyrByContext';
import { DocumentRegistryFragment } from 'packages/common/src/ui/forms/JsonForms/api/operations.generated';
import { PatientFormTab } from './PatientFormTab';
import { PatientResultsTab } from './PatientResultsTab';

enum Tabs {
  Form = 'Form',
  SearchResults = 'SearchResults',
}

const newPatient = (
  documentRegistry: DocumentRegistryFragment
): CreateNewPatient => {
  return {
    id: FnUtils.generateUUID(),
    documentRegistry,
  };
};

interface CreatePatientModal {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const CreatePatientModal: FC<CreatePatientModal> = ({
  open,
  setOpen,
}) => {
  const { data: documentRegistryResponse } = useDocumentRegistryByContext(
    DocumentRegistryNodeContext.Patient
  );
  const [documentRegistry, setDocumentRegistry] = useState<
    DocumentRegistryFragment | undefined
  >();
  const { currentTab, onChangeTab } = useTabs(Tabs.Form);
  const { Modal, showDialog, hideDialog } = useDialog({
    onClose: () => setOpen(false),
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (documentRegistryResponse?.[0]) {
      setDocumentRegistry(documentRegistryResponse?.[0]);
    }
  }, [documentRegistryResponse]);

  useEffect(() => {
    if (open) showDialog();
    else hideDialog();
  }, [open]);

  const { patient, setNewPatient } = useCreatePatientStore();

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
            disabled={patient === undefined}
            onClick={() => {
              hideDialog();
              if (patient) {
                navigate(patient.id);
              }
            }}
          />
        ) : undefined
      }
      nextButton={
        currentTab !== Tabs.SearchResults ? (
          <DialogButton
            variant="next"
            onClick={() => onChangeTab(Tabs.SearchResults)}
          />
        ) : undefined
      }
      cancelButton={
        <DialogButton
          variant="cancel"
          onClick={() => {
            setNewPatient(undefined);
            hideDialog();
          }}
        />
      }
      slideAnimation={false}
    >
      <DetailContainer>
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
            Create New Patient
          </Typography>

          <TabContext value={currentTab}>
            <TabList
              value={currentTab}
              centered
              onChange={(_, v) => onChangeTab(v)}
            >
              <Tab value={Tabs.Form} label="Form" />
              <Tab value={Tabs.SearchResults} label="Results" />
            </TabList>

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
