import React, { FC, useMemo, useState } from 'react';
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
  useUrlQuery,
} from '@openmsupply-client/common';
import { usePatient } from '../api';
import { useCreatePatientStore } from '../hooks';
import { AppBarButtons } from './AppBarButtons';
import { PatientSummary } from './PatientSummary';
import { PatientTab } from './PatientTab';

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
  const {
    urlQuery: { doc },
  } = useUrlQuery();
  const { patient } = useCreatePatientStore();
  const [currentTab, setCurrentTab] = useState<Tabs>(Tabs.Details);
  const t = useTranslation('patients');

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

  const { JsonForm, isLoading } = useJsonForms(doc, { handleSave }, createDoc);

  if (isLoading) return <DetailViewSkeleton />;

  return (
    <React.Suspense fallback={<DetailViewSkeleton />}>
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
        <PatientTab value={Tabs.Details}>{JsonForm}</PatientTab>
      </TabContext>
    </React.Suspense>
  );
};
