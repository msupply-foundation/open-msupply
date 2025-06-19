import React, { useState } from 'react';
import {
  Box,
  useTranslation,
  DialogButton,
  useDialog,
  SaveIcon,
  LoadingButton,
  TabContext,
  Tab,
  BasicSpinner,
  useAuthContext,
  UserPermission,
  TabDefinition,
  useConfirmationModal,
  DetailTab,
  ShortTabList,
} from '@openmsupply-client/common';

import { usePatientEditForm } from './usePatientEditForm';
import { useInsuranceProviders } from '../apiModern/hooks/useInsuranceProviders';
import { InsuranceListView } from '../Insurance';

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

  const {
    JsonForm,
    save,
    isLoading,
    isSaving,
    isDirty,
    validationError,
    revert,
  } = usePatientEditForm(patientId);
  const { userHasPermission } = useAuthContext();

  const { Modal } = useDialog({
    onClose,
    isOpen,
  });

  const requiresConfirmation = (tab: string) => {
    return tab === Tabs.Patient && isDirty;
  };

  const tabs: TabDefinition[] = [
    {
      Component: <Box style={{ maxWidth: 1180, flex: 1 }}>{JsonForm}</Box>,
      value: Tabs.Patient,
      confirmOnLeaving: isDirty,
    },
  ];

  const {
    query: { data: insuranceProvidersData },
  } = useInsuranceProviders();

  if (insuranceProvidersData.length > 0)
    tabs.push({
      Component: <InsuranceListView readOnly={true} patientId={patientId} />,
      value: Tabs.Insurance,
    });

  const showConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-cancel-generic'),
  });

  const onChange = (tab: Tabs) => {
    const tabConfirm = tabs.find(({ value }) => value === currentTab);

    if (!!tabConfirm?.confirmOnLeaving && requiresConfirmation(currentTab)) {
      showConfirmation({
        onConfirm: () => {
          setCurrentTab(tab);
          revert();
        },
      });
    } else {
      setCurrentTab(tab);
    }
  };

  if (isLoading) return <BasicSpinner />;

  return (
    <Modal
      title=""
      width={1180}
      height={750}
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
          onClick={async () => {
            await save();
            onClose();
          }}
          label={t('button.save')}
          startIcon={<SaveIcon />}
        />
      }
      cancelButton={
        <DialogButton
          variant="cancel"
          onClick={() => {
            onClose();
            revert();
          }}
        />
      }
      slideAnimation={false}
    >
      <TabContext value={currentTab}>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          gap={2}
          maxHeight={550}
        >
          <ShortTabList
            value={currentTab}
            centered
            onChange={(_, tab) => onChange(tab)}
          >
            <Tab
              value={Tabs.Patient}
              label={t('label.patient-details')}
              tabIndex={-1}
            />
            {insuranceProvidersData.length > 0 && (
              <Tab value={Tabs.Insurance} label={t('label.insurance')} />
            )}
          </ShortTabList>
          <Box sx={{ overflowY: 'auto', width: '100%', height: '100%' }}>
            {tabs.map(({ Component, value }) => (
              <DetailTab value={value} key={value}>
                {Component}
              </DetailTab>
            ))}
          </Box>
        </Box>
      </TabContext>
    </Modal>
  );
};
