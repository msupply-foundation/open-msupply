import React, { FC } from 'react';
import {
  DetailViewSkeleton,
  SaveDocumentMuation,
  useJsonForms,
  useUrlQuery,
} from '@openmsupply-client/common';
import { usePatient } from '../api';
import { DocumentFragment } from 'packages/common/src/ui/forms/JsonForms/api';

const useUpsertPatient = (): SaveDocumentMuation => {
  const { mutateAsync: insertPatient } = usePatient.document.insert();
  const { mutateAsync: updatePatient } = usePatient.document.update();
  return async (
    jsonData: unknown,
    formSchemaId: string,
    parent?: DocumentFragment
  ) => {
    if (parent?.id === undefined) {
      await insertPatient({
        data: jsonData,
        schemaId: formSchemaId,
      });
    } else {
      await updatePatient({
        data: jsonData,
        parent: parent?.id,
        schemaId: formSchemaId,
      });
    }
  };
};

export const PatientDetailView: FC = () => {
  const {
    urlQuery: { doc },
  } = useUrlQuery();

  const handleSave = useUpsertPatient();
  const { JsonForm, loading, error } = useJsonForms(doc, {
    handleSave,
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
