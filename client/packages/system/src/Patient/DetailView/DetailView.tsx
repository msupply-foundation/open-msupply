import React, { FC } from 'react';
import {
  DetailViewSkeleton,
  SaveAction,
  useJsonForms,
  useUrlQuery,
} from '@openmsupply-client/common';
import { usePatient } from '../api';
import { DocumentFragment } from 'packages/common/src/ui/forms/JsonForms/api';

const useUpsertPatient = (): SaveAction => {
  const {
    mutate: insertPatient,
    isLoading: patientInserting,
    isError: insertError,
  } = usePatient.document.insert();
  const {
    mutate: updatePatient,
    isLoading: patientUpdating,
    isError: updateError,
  } = usePatient.document.update();

  return {
    mutate: (
      jsonData: unknown,
      formSchemaId: string,
      parent?: DocumentFragment
    ) => {
      if (parent?.id === undefined) {
        insertPatient({
          data: jsonData,
          schemaId: formSchemaId,
        });
      } else {
        updatePatient({
          data: jsonData,
          parent: parent?.id,
          schemaId: formSchemaId,
        });
      }
    },
    isSaving: patientInserting || patientUpdating,
    isError: insertError || updateError,
  };
};

export const PatientDetailView: FC = () => {
  const {
    urlQuery: { doc },
  } = useUrlQuery();

  const saveAction = useUpsertPatient();
  const { JsonForm, loading, error } = useJsonForms(doc, {
    saveAction,
  });

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
