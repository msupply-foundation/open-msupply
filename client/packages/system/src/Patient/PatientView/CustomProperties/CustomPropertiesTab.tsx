import React from 'react';
import {
  PropertiesEditTab,
  useAuthContext,
  UserPermission,
} from '@openmsupply-client/common';
import { usePatient } from '../../api';

export const CustomPropertiesTab = ({
  patientId,
  onEdit,
}: {
  patientId: string;
  onEdit: (isDirty: boolean) => void;
}) => {
  const { userHasPermission } = useAuthContext();

  const { data: patient, isLoading } = usePatient.document.get(patientId);
  const { data: definitions = [] } = usePatient.document.propertiesV2();
  const { mutateAsync } = usePatient.document.updatePropertiesV2(patientId);

  return (
    <PropertiesEditTab
      definitions={definitions}
      properties={patient?.propertiesV2}
      isLoading={isLoading}
      disabled={!userHasPermission(UserPermission.PatientMutate)}
      onEdit={onEdit}
      onSave={draft => mutateAsync({ id: patientId, propertiesV2: draft })}
      saveErrorMessage="error.failed-to-save-patient"
    />
  );
};
