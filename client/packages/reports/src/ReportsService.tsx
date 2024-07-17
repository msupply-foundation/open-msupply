import React, { FC } from 'react';
import { Routes, Route } from '@openmsupply-client/common';
import { ListView } from './ListView';
import { DetailView } from './DetailView';

const ReportsService: FC = () => {
  return (
    <Routes>
      <Route path="/:id" element={<DetailView />} />
      <Route path="/" element={<ListView />} />
    </Routes>
  );
};

export default ReportsService;
