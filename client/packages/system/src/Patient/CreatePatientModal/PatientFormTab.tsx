import React, { FC, useState } from 'react';
import {
  additionalRenderers,
  Gender,
  JsonData,
  JsonForm,
  useFormSchema,
  usePatientCreateStore,
} from '@openmsupply-client/programs';
import { PatientPanel } from './PatientPanel';

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
  const { data: patientCreationUI } = useFormSchema.document.byType(
    'PatientCreationJSONForm'
  );
  const [data, setData] = useState<Patient | undefined>();

  const setPatient = (newData: JsonData) => {
    if (
      typeof newData === 'object' &&
      newData !== null &&
      !Array.isArray(newData)
    ) {
      setData(newData as Patient);
      updatePatient({
        code: data?.code || undefined,
        code2: data?.code2 || undefined,
        firstName: data?.firstName || undefined,
        lastName: data?.lastName || undefined,
        dateOfBirth: data?.dateOfBirth || undefined,
        gender: data?.gender || undefined,
      });
    }
  };

  return (
    <PatientPanel value={value} patient={patient}>
      <JsonForm
        data={data || {}}
        jsonSchema={patientCreationUI?.jsonSchema}
        uiSchema={patientCreationUI?.uiSchema}
        isError={false}
        isLoading={false}
        updateData={setPatient}
        additionalRenderers={additionalRenderers}
      />
    </PatientPanel>
  );
};
