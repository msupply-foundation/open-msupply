import React, { FC, useMemo } from 'react';
import {
  DetailViewSkeleton,
  SavedDocument,
  SaveJob,
  useJsonForms,
  useNavigate,
  useUrlQuery,
} from '@openmsupply-client/common';
import { usePatient } from '../api';
import { useCreatePatientStore } from '../hooks/useCreatePatientStore';

const useUpsertPatient = (): SaveJob => {
  const { setNewPatient } = useCreatePatientStore();
  const { mutateAsync: insertPatient } = usePatient.document.insert();
  const { mutateAsync: updatePatient } = usePatient.document.update();
  return async (jsonData: unknown, formSchemaId: string, parent?: string) => {
    if (parent === undefined) {
      const result = await insertPatient({
        data: jsonData,
        schemaId: formSchemaId,
      });
      if (!result.document) throw Error('Inserted document not set!');
      // clean up the create patient store
      setNewPatient(undefined);
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
  const { patient } = useCreatePatientStore();
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

  const navigate = useNavigate();
  const onJobSaved = (document: SavedDocument) => {
    // if new document has created update the url:
    if (document.name !== doc) {
      navigate(`?doc=${document.name}`);
    }
  };
  const saveJob = useUpsertPatient();
  const { JsonForm, loading, error } = useJsonForms(
    doc,
    { saveJob, onJobSaved },
    createDoc
  );

  if (loading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  return (
    <React.Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      {/* <Toolbar /> */}

      {!error ? JsonForm : error}
    </React.Suspense>
  );
};
