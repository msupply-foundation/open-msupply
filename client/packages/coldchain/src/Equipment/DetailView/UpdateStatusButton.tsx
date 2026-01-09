import React, { useEffect, useState } from 'react';
import {
  ButtonWithIcon,
  useTranslation,
  PlusCircleIcon,
  useDialog,
  DialogButton,
  useNotification,
  Box,
  DetailContainer,
  InsertAssetLogInput,
  FnUtils,
  UserPermission,
  useAuthContext,
  useIsGapsStoreOnly,
} from '@openmsupply-client/common';
import { StatusForm, Draft } from './StatusForm';
import { useAssets } from '../api';
import { Environment } from '@openmsupply-client/config/src';

const getEmptyAssetLog = (assetId: string) => ({
  id: FnUtils.generateUUID(),
  assetId,
});

export const UpdateStatusButtonComponent = ({
  assetId,
}: {
  assetId: string | undefined;
}) => {
  const t = useTranslation();
  const { error, success, info } = useNotification();
  const { userHasPermission } = useAuthContext();
  const onClose = () => {
    setDraft(getEmptyAssetLog(assetId ?? 'closed'));
  };
  const { Modal, hideDialog, showDialog } = useDialog({ onClose });
  const { insertLog, invalidateQueries } = useAssets.log.insert();
  const [draft, setDraft] = useState<Partial<Draft>>(getEmptyAssetLog(''));
  const isGaps = useIsGapsStoreOnly();

  const onUpdateStatus = () => {
    if (
      userHasPermission(UserPermission.AssetMutate) ||
      userHasPermission(UserPermission.AssetStatusMutate)
    ) {
      showDialog();
    } else info(t('error.no-asset-edit-status-permission'))();
  };

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
          <DialogButton variant="ok" onClick={onOk} disabled={!draft.status} />
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
            <StatusForm draft={draft} onChange={onChange} />
          </Box>
        </DetailContainer>
      </Modal>
      <ButtonWithIcon
        shouldShrink={!isGaps}
        Icon={<PlusCircleIcon />}
        label={t('button.update-status')}
        onClick={onUpdateStatus}
      />
    </>
  );
};

export const UpdateStatusButton = React.memo(UpdateStatusButtonComponent);
