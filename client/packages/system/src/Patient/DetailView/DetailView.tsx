import React, { FC } from 'react';
import {
  DetailViewSkeleton,
  useJsonForms,
  useUrlQuery,
} from '@openmsupply-client/common';

export const PatientDetailView: FC = () => {
  // const { patientId } = useParams();
  const {
    urlQuery: { doc },
  } = useUrlQuery();
  const { JsonForm, loading, error } = useJsonForms(doc);

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
