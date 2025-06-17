import React, { useState } from 'react';
import {
  DetailContainer,
  Box,
  useTranslation,
  DialogButton,
  useDialog,
  SaveIcon,
  LoadingButton,
  DetailSection,
  TabContext,
  Tab,
  TabList,
  BasicSpinner,
  useAuthContext,
  UserPermission,
} from '@openmsupply-client/common';

import { usePatientEditForm } from './usePatientEditForm';
import { PatientPanel } from '../CreatePatientModal/PatientPanel';
import { useInsuranceProviders } from '../apiModern/hooks/useInsuranceProviders';
import { PatientInsuranceTab } from './PatientInsuranceTab';

enum Tabs {
  Patient = 'Patient',
  Insurance = 'Insurance',
}

export const EditPatientModal = ({
  isOpen,
  patientId,
  onClose,
}: {
  isOpen: boolean;
  patientId: string;
  onClose: (patientId?: string) => void;
}) => {
  const t = useTranslation();
  const [currentTab, setCurrentTab] = useState(Tabs.Patient);

  const { JsonForm, save, isLoading, isSaving, isDirty, validationError } =
    usePatientEditForm(patientId, onClose);
  const { userHasPermission } = useAuthContext();

  const { Modal } = useDialog({
    onClose,
    isOpen,
  });

  const {
    query: { data: insuranceProvidersData },
  } = useInsuranceProviders();

  if (isLoading) return <BasicSpinner />;

  return (
    <Modal
      title=""
      width={950}
      height={650}
      okButton={
        <LoadingButton
          color="secondary"
          disabled={
            !isDirty ||
            isSaving ||
            !!validationError ||
            !userHasPermission(UserPermission.PatientMutate)
          }
          isLoading={isLoading}
          onClick={() => save()}
          label={t('button.save')}
          startIcon={<SaveIcon />}
        />
      }
      cancelButton={
        <DialogButton
          variant="cancel"
          onClick={() => {
            onClose();
          }}
        />
      }
      slideAnimation={false}
    >
      <TabContext value={currentTab}>
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <DetailSection title="">
            <Box flex={1}>
              <TabList
                value={currentTab}
                centered
                onChange={(_, v) => setCurrentTab(v)}
              >
                <Tab
                  value={Tabs.Patient}
                  label={t('label.patient-details')}
                  tabIndex={-1}
                />
                {insuranceProvidersData.length > 0 && (
                  <Tab
                    value={Tabs.Insurance}
                    label={t('label.insurance')}
                    tabIndex={-1}
                  />
                )}
              </TabList>
            </Box>
          </DetailSection>
        </Box>
        <DetailContainer>
          <PatientPanel value={Tabs.Patient}>{JsonForm}</PatientPanel>
          <PatientPanel value={Tabs.Insurance}>
            <PatientInsuranceTab />
          </PatientPanel>
        </DetailContainer>
      </TabContext>
    </Modal>
  );
};
