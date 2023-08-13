import React, { FC } from 'react';
import {
  RouteBuilder,
  Routes,
  Route,
  useSearchParams,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ContactTraceListView } from '../ListView';
import { DetailView } from '../DetailView';
export const Service: FC = () => {
  const contactTracesRoute = RouteBuilder.create(AppRoute.ContactTrace).build();

  const contactTraceRoute = RouteBuilder.create(AppRoute.ContactTrace)
    .addPart(':id')
    .build();

  const [searchParams] = useSearchParams();
  return (
    <Routes>
      <Route path={contactTracesRoute} element={<ContactTraceListView />} />
      <Route
        path={contactTraceRoute}
        element={
          <DetailView
            createType={searchParams.get('type')}
            createPatientId={searchParams.get('patient')}
          />
        }
      />
    </Routes>
  );
};

export default Service;
