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
  useDebounceCallback,
  DetailContainer,
  InsertAssetLogInput,
  FnUtils,
  ClickableStepper,
} from '@openmsupply-client/common';
import { Draft, Statusform } from './StatusForm';
import { useAssets } from '../api';
import { Environment } from '@openmsupply-client/config/src';

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
  const t = useTranslation();
  const { Modal, hideDialog, showDialog } = useDialog({ onClose });
  const { error, success } = useNotification();
  const [draft, setDraft] = useState<Partial<Draft>>(getEmptyAssetLog(''));
  const { insertLog, invalidateQueries } = useAssets.log.insert();

  const onNext = useDebounceCallback(() => {
    onChangeTab(Tabs.Upload);
  }, []);

  const onOk = async () => {
    await insertLog(draft)
      .then(({ id }) => {
        invalidateQueries();
        if (!draft.files?.length)
          return new Promise(resolve => resolve('no files'));

        const url = `${Environment.SYNC_FILES_URL}/asset_log/${id}`;
        const formData = new FormData();
        draft.files?.forEach(file => {
          formData.append('files', file);
        });

        return fetch(url, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
          },
          credentials: 'include',
          body: formData,
        });
      })
      .then(() => {
        success(t('messages.log-saved-successfully'))();
        hideDialog();
        onClose();
      })
      .catch(e => error(`${t('error.unable-to-save-log')}: ${e.message}`)());
  };

  const logSteps = [
    {
      description: '',
      label: t('label.status'),
      tab: Tabs.Status,
      clickable: true,
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

  const isInvalid = () => !draft?.id || !draft?.assetId || !draft?.status;

  const onChange = (patch: Partial<InsertAssetLogInput>) => {
    if (!draft) return;
    setDraft({ ...draft, ...patch });
  };

  const onClickStep = (tabName: string) => {
    switch (tabName) {
      case Tabs.Upload:
        onChangeTab(tabName as Tabs);
        break;
      case Tabs.Status:
        onChangeTab(tabName as Tabs);
        break;
    }
  };

  useEffect(() => {
    if (!!assetId) setDraft(getEmptyAssetLog(assetId));
  }, [assetId]);

  return (
    <>
      <Modal
        width={785}
        sx={{ '& .MuiDialogContent-root': { paddingTop: 0 } }}
        title={t('button.update-status')}
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
          currentTab === Tabs.Upload ? (
            <DialogButton variant="ok" onClick={onOk} />
          ) : undefined
        }
        nextButton={
          currentTab === Tabs.Status ? (
            <DialogButton
              variant="next-and-ok"
              onClick={onNext}
              disabled={isInvalid()}
            />
          ) : undefined
        }
      >
        <DetailContainer paddingTop={1}>
          <Box
            alignItems="center"
            display="flex"
            flex={1}
            flexDirection="column"
            gap={2}
            sx={{
              '& .MuiStepConnector-root': {
                minWidth: '75px',
              },
            }}
          >
            <ClickableStepper
              activeStep={getActiveStep()}
              steps={logSteps}
              onClickStep={onClickStep}
            />
            <TabContext value={currentTab}>
              <Statusform
                draft={draft}
                onChange={onChange}
              />

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
