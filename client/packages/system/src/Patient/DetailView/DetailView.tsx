import React, { FC } from 'react';
import {
  DetailViewSkeleton,
  useJsonForms,
  useParams,
} from '@openmsupply-client/common';

export const PatientDetailView: FC = () => {
  const { patientId } = useParams();
  const { JsonForm, loading, error } = useJsonForms(patientId);

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
