import React, { FC } from 'react';
import { Routes, Route } from '@openmsupply-client/common';
import { PatientListView } from '../ListView';

export const Service: FC = () => {
  return (
    <Routes>
      <Route path={''} element={<PatientListView />} />
    </Routes>
  );
};

export default Service;
