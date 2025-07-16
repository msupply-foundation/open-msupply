import React from 'react';
import {
  Alert,
  BasicSpinner,
  useTranslation,
  ObjUtils,
} from '@openmsupply-client/common';
import {
  Gender,
  JsonData,
  JsonForm,
  JsonFormsReactProps,
  useFormSchema,
  IdGenerator,
  idGeneratorTester,
  usePatientStore,
} from '@openmsupply-client/programs';
import { PatientPanel } from './PatientPanel';
import defaultPatientSchema from './DefaultCreatePatientSchema.json';
import defaultPatientUISchema from './DefaultCreatePatientUISchema.json';

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

export const PatientFormTab = ({
  patient,
  value,
  onChange,
}: PatientPanel & JsonFormsReactProps) => {
  const t = useTranslation();
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
      <Alert severity="info">{t('messages.patients-search')}</Alert>
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
