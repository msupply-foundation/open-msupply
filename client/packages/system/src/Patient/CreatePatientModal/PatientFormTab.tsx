import React, { FC } from 'react';
import {
  Gender,
  JsonData,
  JsonForm,
  useFormSchema,
  usePatientCreateStore,
} from '@openmsupply-client/programs';
import { PatientPanel } from './PatientPanel';
import { createPatient, createPatientUI } from './DefaultCreatePatientJsonForm';

type Patient = {
  code?: string;
  code2?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: Gender;
};

export const PatientFormTab: FC<PatientPanel> = ({ patient, value }) => {
  const { updatePatient } = usePatientCreateStore();
  const {
    data: patientCreationUI,
    isError,
    isLoading,
  } = useFormSchema.document.byType('PatientCreationJSONForms');

  const setPatient = (newData: JsonData) => {
    if (
      typeof newData === 'object' &&
      newData !== null &&
      !Array.isArray(newData)
    ) {
      const patientData = newData as Patient;
      updatePatient({
        code: patientData?.code,
        code2: patientData?.code2,
        firstName: patientData?.firstName,
        lastName: patientData?.lastName,
        dateOfBirth: patientData?.dateOfBirth,
        gender: patientData?.gender,
      });
    }
  };

  return (
    <PatientPanel value={value} patient={patient}>
      <JsonForm
        data={(patient as JsonData) || {}}
        jsonSchema={patientCreationUI?.jsonSchema || createPatient}
        uiSchema={patientCreationUI?.uiSchema || createPatientUI}
        isError={patientCreationUI ? isError : false}
        isLoading={patientCreationUI ? isLoading : false}
        updateData={setPatient}
      />
    </PatientPanel>
  );
};
