import React, { FC } from 'react';
import {
  Gender,
  JsonData,
  JsonForm,
  JsonFormsReactProps,
  useFormSchema,
  usePatientStore,
} from '@openmsupply-client/programs';
import { PatientPanel } from './PatientPanel';
import { ObjUtils } from '@common/utils';

import defaultPatientSchema from './DefaultCreatePatientSchema.json';
import defaultPatientUISchema from './DefaultCreatePatientUISchema.json';
import { BasicSpinner } from '@openmsupply-client/common';
import { IdGenerator, idGeneratorTester } from '@openmsupply-client/programs';

type Patient = {
  code?: string;
  code2?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  address1?: string;
  phone?: string;
};

export const PatientFormTab: FC<PatientPanel & JsonFormsReactProps> = ({
  patient,
  value,
  onChange,
}) => {
  const { updateCreateNewPatient } = usePatientStore();
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
      // Prevents infinite re-render if data hasn't actually changed, but
      // instance of "patient" has
      if (ObjUtils.isEqual(patient, newData)) return;

      const patientData = newData as Patient;
      updateCreateNewPatient({
        code: patientData?.code,
        code2: patientData?.code2,
        firstName: patientData?.firstName,
        lastName: patientData?.lastName,
        dateOfBirth: patientData?.dateOfBirth,
        gender: patientData?.gender,
        address1: patientData?.address1,
        phone: patientData?.phone,
      });
    }
  };

  if (isLoading) return <BasicSpinner />;

  return (
    <PatientPanel value={value} patient={patient}>
      <JsonForm
        data={(patient as JsonData) || {}}
        jsonSchema={patientCreationUI?.jsonSchema || defaultPatientSchema}
        uiSchema={patientCreationUI?.uiSchema || defaultPatientUISchema}
        isError={patientCreationUI ? isError : false}
        isLoading={patientCreationUI ? isLoading : false}
        updateData={setPatient}
        additionalRenderers={[
          { tester: idGeneratorTester, renderer: IdGenerator },
        ]}
        onChange={onChange}
      />
    </PatientPanel>
  );
};
