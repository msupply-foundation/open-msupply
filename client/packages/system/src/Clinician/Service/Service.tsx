import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ClinicianListView } from '../ListView';

export const Service: FC = () => {
  const cliniciansRoute = RouteBuilder.create(AppRoute.Clinicians).build();

  return (
    <Routes>
      <Route path={cliniciansRoute} element={<ClinicianListView />} />
    </Routes>
  );
};

export default Service;
