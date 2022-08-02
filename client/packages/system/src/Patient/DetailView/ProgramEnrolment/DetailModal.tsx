import React, { FC } from 'react';
import {
  DetailViewSkeleton,
  SaveDocumentMutation,
  useJsonForms,
  useUrlQuery,
} from '@openmsupply-client/common';
import { useProgramEnrolment } from './api/hooks';

const useUpsertProgramEnrolment = (
  patientId: string,
  type: string
): SaveDocumentMutation => {
  const { mutateAsync: insertProgram } = useProgramEnrolment.document.insert();
  const { mutateAsync: updateProgramEnrolment } =
    useProgramEnrolment.document.update();
  return async (jsonData: unknown, formSchemaId: string, parent?: string) => {
    if (parent === undefined) {
      const result = await insertProgram({
        data: jsonData,
        schemaId: formSchemaId,
        patientId,
        type,
      });
      return result;
    } else {
      const result = await updateProgramEnrolment({
        data: jsonData,
        parent,
        schemaId: formSchemaId,
        patientId,
        type,
      });
      return result;
    }
  };
};

export const ProgramDetailView: FC = () => {
  const {
    urlQuery: { patientId, type, doc },
  } = useUrlQuery();

  const handleSave = useUpsertProgramEnrolment(patientId, type);
  const { JsonForm, isLoading } = useJsonForms(doc, { handleSave });

  if (isLoading) return <DetailViewSkeleton />;

  return (
    <React.Suspense fallback={<DetailViewSkeleton />}>
      {JsonForm}
    </React.Suspense>
  );
};
