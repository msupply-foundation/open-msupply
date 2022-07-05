import React, { FC } from 'react';
import { CircularProgress } from '@openmsupply-client/common';
import { PatientPanel } from './PatientPanel';

export const PatientResultsTab: FC<PatientPanel> = ({ patient, value }) => {
  return (
    <PatientPanel value={value} patient={patient}>
      <CircularProgress size={20} />{' '}
    </PatientPanel>
  );
};
