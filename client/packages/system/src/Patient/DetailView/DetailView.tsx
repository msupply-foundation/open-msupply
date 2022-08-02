import React, { FC, useMemo } from 'react';
import {
  DetailViewSkeleton,
  SaveDocumentMutation,
  useJsonForms,
  useUrlQuery,
} from '@openmsupply-client/common';
import { usePatient } from '../api';
import { useCreatePatientStore } from '../hooks';
import { AppBarButtons } from './AppBarButtons';
import { PatientSummary } from './PatientSummary';

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
      {JsonForm}
    </React.Suspense>
  );
};
