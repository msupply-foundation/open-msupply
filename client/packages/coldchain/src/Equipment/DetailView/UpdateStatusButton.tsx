import React, { useEffect, useState } from 'react';
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
  // WizardStepper,
  // useDebounceCallback,
  DetailContainer,
  InsertAssetLogInput,
  FnUtils,
} from '@openmsupply-client/common';
import { StatusTab } from './StatusTab';
import { UploadTab } from './UploadTab';
import { useAssets } from '../api';

enum Tabs {
  Status = 'Status',
  Upload = 'UploadFiles',
}

const getEmptyAssetLog = (assetId: string) => ({
  id: FnUtils.generateUUID(),
  assetId,
});

export const UpdateStatusButtonComponent = ({
  assetId,
}: {
  assetId: string | undefined;
}) => {
  const onClose = () => {
    setDraft(getEmptyAssetLog(assetId ?? 'closed'));
    onChangeTab(Tabs.Status);
  };
  const { currentTab, onChangeTab } = useTabs(Tabs.Status);
  const t = useTranslation('coldchain');
  const { Modal, hideDialog, showDialog } = useDialog({ onClose });
  const { error, success } = useNotification();
  const [draft, setDraft] = useState<Partial<InsertAssetLogInput>>(
    getEmptyAssetLog('')
  );
  const { mutateAsync: insert } = useAssets.log.insert();

  // const onNext = useDebounceCallback(() => {
  //   onChangeTab(Tabs.Upload);
  // }, []);

  const onOk = async () => {
    await insert(draft)
      .then(() => {
        success(t('messages.log-saved-successfully'))();
        hideDialog();
        onClose();
      })
      .catch(e => error(`${t('error.unable-to-save-log')}: ${e.message}`)());
  };

  // const logSteps = [
  //   {
  //     description: '',
  //     label: t('label.status'),
  //     tab: Tabs.Status,
  //   },
  //   {
  //     description: '',
  //     label: t('label.upload-files'),
  //     tab: Tabs.Upload,
  //   },
  // ];

  // const getActiveStep = () => {
  //   const step = logSteps.find(step => step.tab === currentTab);
  //   return step ? logSteps.indexOf(step) : 0;
  // };

  const isInvalid = () => !draft?.id || !draft?.assetId || !draft?.status;

  const onChange = (patch: Partial<InsertAssetLogInput>) => {
    if (!draft) return;
    setDraft({ ...draft, ...patch });
  };

  useEffect(() => {
    if (!!assetId) setDraft(getEmptyAssetLog(assetId));
  }, [assetId]);

  return (
    <>
      <Modal
        width={785}
        sx={{ '& .MuiDialogContent-root': { paddingTop: 0 } }}
        title="Add Item"
        cancelButton={
          <DialogButton
            variant="cancel"
            onClick={() => {
              onClose();
              hideDialog();
            }}
          />
        }
        okButton={
          <DialogButton variant="ok" onClick={onOk} disabled={isInvalid()} />
        }
        // okButton={
        //   currentTab === Tabs.Upload ? (
        //     <DialogButton variant="ok" onClick={onOk} />
        //   ) : undefined
        // }
        // nextButton={
        //   currentTab === Tabs.Status ? (
        //     <DialogButton
        //       variant="next"
        //       onClick={onNext}
        //       disabled={isInvalid()}
        //     />
        //   ) : undefined
        // }
      >
        <DetailContainer paddingTop={0}>
          <Box
            alignItems="center"
            display="flex"
            flex={1}
            flexDirection="column"
            gap={2}
            sx={{
              '& .MuiStep-horizontal': {
                minWidth: '175px',
              },
            }}
          >
            {/* <WizardStepper
              activeStep={getActiveStep()}
              steps={logSteps}
              nowrap
            /> */}
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
