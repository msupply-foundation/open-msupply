import React, { FC } from 'react';
import { Routes, Route } from '@openmsupply-client/common';
import { ListView } from './ListView';

const ReportsService: FC = () => {
  return (
    <Routes>
      <Route path="/" element={<ListView />} />
    </Routes>
  );
};

export default ReportsService;
