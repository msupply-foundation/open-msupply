import React, { FC, useEffect, useMemo } from 'react';
import {
  DetailTabs,
  DetailViewSkeleton,
  SaveDocumentMutation,
  useJsonForms,
} from '@openmsupply-client/common';
import { usePatient } from '../api';
import { usePatientCreateStore, usePatientStore } from '../hooks';
import { AppBarButtons } from './AppBarButtons';
import { PatientSummary } from './PatientSummary';
import { ProgramDetailModal, ProgramListView } from '../ProgramEnrolment';
import { EncounterDetailModal, EncounterListView } from '../Encounter';

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

  const tabs = [
    {
      Component: JsonForm,
      value: 'Details',
    },
    {
      Component: <ProgramListView />,
      value: 'Programs',
    },
    {
      Component: <EncounterListView />,
      value: 'Encounters',
    },
  ];

  return (
    <React.Suspense fallback={<DetailViewSkeleton />}>
      <ProgramDetailModal />
      <EncounterDetailModal />
      <AppBarButtons />
      <PatientSummary />
      <DetailTabs tabs={tabs} />
    </React.Suspense>
  );
};
