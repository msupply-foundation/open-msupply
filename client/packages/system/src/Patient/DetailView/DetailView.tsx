import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  AppBarTabsPortal,
  Box,
  DetailViewSkeleton,
  SaveDocumentMutation,
  Tab,
  TabContext,
  TabList,
  useJsonForms,
  useTranslation,
} from '@openmsupply-client/common';
import { usePatient } from '../api';
import { usePatientCreateStore, usePatientStore } from '../hooks';
import { AppBarButtons } from './AppBarButtons';
import { PatientSummary } from './PatientSummary';
import { PatientTab } from './PatientTab';
import { ProgramDetailModal, ProgramListView } from './ProgramEnrolment';

enum Tabs {
  Details = 'Details',
  Programs = 'Programs',
}

const useUpsertPatient = (): SaveDocumentMutation => {
  const { mutateAsync: insertPatient } = usePatient.document.insert();
  const { mutateAsync: updatePatient } = usePatient.document.update();
  return async (jsonData: unknown, formSchemaId: string, parent?: string) => {
    if (parent === undefined) {
      const result = await insertPatient({
        data: jsonData,
        schemaId: formSchemaId,
      });
      if (!result.document) throw Error('Inserted document not set!');
      return result.document;
    } else {
      const result = await updatePatient({
        data: jsonData,
        parent,
        schemaId: formSchemaId,
      });
      if (!result.document) throw Error('Inserted document not set!');
      return result.document;
    }
  };
};

export const PatientDetailView: FC = () => {
  const { documentName, setDocumentName } = usePatientStore();
  const { patient } = usePatientCreateStore();
  const [currentTab, setCurrentTab] = useState<Tabs>(Tabs.Details);
  const t = useTranslation('patients');
  const patientId = usePatient.utils.id();
  const { data: currentPatient } = usePatient.document.get(patientId);

  // we have to memo createDoc to avoid an infinite render loop
  const createDoc = useMemo(() => {
    if (patient) {
      return {
        documentRegistry: patient.documentRegistry,
        data: {
          id: patient.id,
          code: patient.code,
          firstName: patient.firstName,
          lastName: patient.lastName,
          gender: patient.gender,
          dateOfBirth: patient.dateOfBirth,
          addresses: [],
          contactDetails: [],
          socioEconomics: {},
          isDeceased: false,
        },
      };
    } else return undefined;
  }, [patient]);

  const handleSave = useUpsertPatient();
  const { JsonForm, isLoading } = useJsonForms(
    documentName,
    { handleSave },
    createDoc
  );

  useEffect(() => {
    if (!documentName && currentPatient) {
      setDocumentName(currentPatient?.document?.name);
    }
  }, [currentPatient]);

  if (isLoading) return <DetailViewSkeleton />;

  return (
    <React.Suspense fallback={<DetailViewSkeleton />}>
      <ProgramDetailModal />
      <AppBarButtons />
      <PatientSummary />
      <TabContext value={currentTab}>
        <AppBarTabsPortal
          sx={{
            display: 'flex',
            flex: 1,
            marginBottom: 1,
            justifyContent: 'center',
          }}
        >
          <Box flex={1}>
            <TabList
              value={currentTab}
              centered
              onChange={(_, v) => setCurrentTab(v)}
            >
              <Tab
                value={Tabs.Details}
                label={t('label.details')}
                tabIndex={-1}
              />
              <Tab
                value={Tabs.Programs}
                label={t('label.programs')}
                tabIndex={-1}
              />
            </TabList>
          </Box>
        </AppBarTabsPortal>
        <PatientTab value={Tabs.Details} padding={3}>
          {JsonForm}
        </PatientTab>
        <PatientTab value={Tabs.Programs}>
          <ProgramListView />
        </PatientTab>
      </TabContext>
    </React.Suspense>
  );
};
