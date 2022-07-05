import React, { FC, useMemo } from 'react';
import {
  DetailViewSkeleton,
  SaveDocumentMuation,
  useJsonForms,
  useLocation,
  useUrlQuery,
} from '@openmsupply-client/common';
import { usePatient } from '../api';
import { CreateNewPatient } from '../CreatePatientModal';
import { AppBarButtons } from './AddBarButtons';

const useUpsertPatient = (): SaveDocumentMuation => {
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
  // check if there is a "create patient" request, i.e. if patient is set in the store
  const location = useLocation();
  const patient = location.state as CreateNewPatient | undefined;

  // we have to memo createDoc to avoid an infinite render loop
  const createDoc = useMemo(() => {
    if (patient) {
      return {
        documentRegistry: patient.documentRegistry,
        data: {
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          addresses: [],
          contactDetails: [],
          socioEconomics: {},
        },
      };
    } else return undefined;
  }, [patient]);

  const handleSave = useUpsertPatient();

  const { JsonForm, loading } = useJsonForms(doc, { handleSave }, createDoc);

  if (loading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  return (
    <React.Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      <AppBarButtons />

      {JsonForm}
    </React.Suspense>
  );
};
