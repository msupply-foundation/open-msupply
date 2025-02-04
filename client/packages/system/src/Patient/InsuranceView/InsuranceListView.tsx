import React from 'react';
import { usePatient } from '../api';

export const InsuranceListView = () => {
  const { data } = usePatient.document.getPatientInsurances();

  console.log('data', data);

  return <div>InsuranceListView</div>;
};
