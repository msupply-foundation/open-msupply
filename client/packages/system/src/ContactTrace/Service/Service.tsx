import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ContactTraceListView } from '../ListView';
import { DetailView } from '../DetailView';

export const Service: FC = () => {
  const contactTracesRoute = RouteBuilder.create(AppRoute.ContactTrace).build();
  const contactTraceRoute = RouteBuilder.create(AppRoute.ContactTrace)
    .addPart(':id')
    .build();
  return (
    <Routes>
      <Route path={contactTracesRoute} element={<ContactTraceListView />} />
      <Route path={contactTraceRoute} element={<DetailView />} />
    </Routes>
  );
};

export default Service;
