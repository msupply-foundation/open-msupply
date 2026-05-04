import React, { useEffect, useState } from 'react';
import {
  useTranslation,
  useDialog,
  DialogButton,
  useNotification,
  Box,
  DetailContainer,
  InsertAssetLogInput,
  FnUtils,
  AssetLogStatusNodeType,
} from '@openmsupply-client/common';
import { StatusForm, Draft } from './StatusForm';
import { useAssets } from '../api';
import { Environment } from '@openmsupply-client/config';
import { useAssetLogReasonList } from '@openmsupply-client/system';

const getEmptyAssetLog = (assetId: string) => ({
  id: FnUtils.generateUUID(),
  assetId,
});

export const useStatusLogDialog = (assetId: string | undefined) => {
  const t = useTranslation();
  const { error, success } = useNotification();
  const { insertLog, invalidateQueries } = useAssets.log.insert();

  const [draft, setDraft] = useState<Partial<Draft>>(getEmptyAssetLog(''));

  useEffect(() => {
    if (assetId) setDraft(getEmptyAssetLog(assetId));
  }, [assetId]);

  const onClose = () => setDraft(getEmptyAssetLog(assetId ?? ''));
  const { Modal, hideDialog, showDialog } = useDialog({ onClose });

  const { data: reasonsData } = useAssetLogReasonList(
    draft.status
      ? { assetLogStatus: { equalTo: draft.status } }
      : undefined
  );

  const isSubmitDisabled = () => {
    if (!draft.status) return true;
    if (
      draft.status === AssetLogStatusNodeType.NotFunctioning &&
      (draft.reasonId === undefined || draft.reasonId === '')
    )
      return true;
    const selectedReason = reasonsData?.nodes?.find(
      reason => reason.id === draft.reasonId
    );
    if (selectedReason?.commentsRequired && !draft.comment?.trim()) return true;
    return false;
  };

  const onOk = async () => {
    await insertLog(draft)
      .then(({ id }) => {
        invalidateQueries();
        if (!draft.files?.length)
          return new Promise(resolve => resolve('no files'));
        const url = `${Environment.SYNC_FILES_URL}/asset_log/${id}`;
        const formData = new FormData();
        draft.files?.forEach(file => formData.append('files', file));
        return fetch(url, {
          method: 'POST',
          headers: { Accept: 'application/json' },
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
    setDraft(prev => ({ ...prev, ...patch }));
  };

  const StatusModal = (
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
        <DialogButton
          variant="ok"
          onClick={onOk}
          disabled={isSubmitDisabled()}
        />
      }
    >
      <DetailContainer paddingTop={1}>
        <Box
          alignItems="center"
          display="flex"
          flex={1}
          flexDirection="column"
          gap={2}
        >
          <StatusForm draft={draft} onChange={onChange} />
        </Box>
      </DetailContainer>
    </Modal>
  );

  return { StatusModal, showDialog };
};
