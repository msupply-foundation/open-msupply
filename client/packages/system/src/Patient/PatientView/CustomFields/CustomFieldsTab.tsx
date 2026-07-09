import React from 'react';
import {
  CustomFieldsEditTab,
  useAuthContext,
  UserPermission,
} from '@openmsupply-client/common';
import { usePatient } from '../../api';

export const CustomFieldsTab = ({
  patientId,
  onEdit,
}: {
  patientId: string;
  onEdit: (isDirty: boolean) => void;
}) => {
  const { userHasPermission } = useAuthContext();

  const { data: patient, isLoading } = usePatient.document.get(patientId);
  const { data: definitions = [] } = usePatient.document.customFields();
  const { mutateAsync } = usePatient.document.updateCustomFields(patientId);

  return (
    <CustomFieldsEditTab
      definitions={definitions}
      properties={patient?.customFields}
      isLoading={isLoading}
      disabled={!userHasPermission(UserPermission.PatientMutate)}
      onEdit={onEdit}
      onSave={draft => mutateAsync({ id: patientId, customFields: draft })}
      saveErrorMessage="error.failed-to-save-patient"
    />
  );
};
