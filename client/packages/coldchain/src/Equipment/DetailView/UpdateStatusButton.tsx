import React, { useState } from 'react';
import {
  ButtonWithIcon,
  useTranslation,
  PlusCircleIcon,
  useDialog,
  DialogButton,
  useNotification,
  TabContext,
  Box,
  useTabs,
  WizardStepper,
  useDebounceCallback,
  DetailContainer,
} from '@openmsupply-client/common';
import { StatusTab } from './StatusTab';
import { UploadTab } from './UploadTab';
import { AssetLogFragment } from '../api';

enum Tabs {
  Status = 'Status',
  Upload = 'UploadFiles',
}
export const UpdateStatusButtonComponent = () => {
  const { currentTab, onChangeTab } = useTabs(Tabs.Status);
  const t = useTranslation('coldchain');
  const { Modal, hideDialog, showDialog } = useDialog();
  const { success } = useNotification();
  // TODO create a draft object
  const [draft, setDraft] = useState<Partial<AssetLogFragment>>({
    id: '',
  });

  const onNext = useDebounceCallback(() => {
    onChangeTab(Tabs.Upload);
  }, []);

  const onOk = () => {
    success(t('messages.log-saved-successfully'))();
  };

  const logSteps = [
    {
      description: '',
      label: t('label.status'),
      tab: Tabs.Status,
    },
    {
      description: '',
      label: t('label.upload-files'),
      tab: Tabs.Upload,
    },
  ];

  const getActiveStep = () => {
    const step = logSteps.find(step => step.tab === currentTab);
    return step ? logSteps.indexOf(step) : 0;
  };

  const isValid = () => false;

  const onChange = (patch: Partial<AssetLogFragment>) => {
    if (!draft) return;
    setDraft({ ...draft, ...patch });
  };

  return (
    <>
      <Modal
        title="Add Item"
        cancelButton={<DialogButton variant="cancel" onClick={hideDialog} />}
        okButton={
          currentTab === Tabs.Upload ? (
            <DialogButton variant="ok" onClick={onOk} />
          ) : undefined
        }
        nextButton={
          currentTab === Tabs.Status ? (
            <DialogButton
              variant="next"
              onClick={onNext}
              disabled={!isValid()}
            />
          ) : undefined
        }
      >
        <DetailContainer>
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            gap={2}
            sx={{
              '& .MuiStep-horizontal': {
                minWidth: '175px',
              },
            }}
          >
            <WizardStepper
              activeStep={getActiveStep()}
              steps={logSteps}
              nowrap
            />
            <TabContext value={currentTab}>
              <StatusTab
                draft={draft}
                value={Tabs.Status}
                onChange={onChange}
              />
              <UploadTab draft={draft} value={Tabs.Upload} />
            </TabContext>
          </Box>
        </DetailContainer>
      </Modal>
      <ButtonWithIcon
        Icon={<PlusCircleIcon />}
        label={t('button.update-status')}
        onClick={showDialog}
      />
    </>
  );
};

export const UpdateStatusButton = React.memo(UpdateStatusButtonComponent);
