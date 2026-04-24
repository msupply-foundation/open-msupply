import React from 'react';
import {
  useTranslation,
  DetailContainer,
  Box,
  useDialog,
  DialogButton,
  Divider,
  InputWithLabelRow,
  BasicTextInput,
  // PasswordTextInput,
  // IconButton,
  // XCircleIcon,
  Typography,
} from '@openmsupply-client/common';
import { DraftSite, useSiteStoresDraft } from '../api';
import { SiteStoresSection } from './SiteStoresSection';

// TODO: Edit/delete is disabled for now and will be revisited in the future.
interface SiteEditModalProps {
  site: DraftSite;
  isOpen: boolean;
  onClose: () => void;
  updateDraft: (patch: Partial<DraftSite>) => void;
  // upsert: (afterUpsert: () => Promise<void>) => Promise<void>;
  // onDelete: () => void;
}

export const SiteEditModal = ({
  site,
  isOpen,
  onClose,
  updateDraft,
}: // upsert,
  // onDelete,
  SiteEditModalProps) => {
  const t = useTranslation();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const { id, code, name, clearHardwareId, hardwareId, isNew } = site;
  const isExisting = !isNew;

  // const isValidCode = code.trim().length > 0 || (isExisting && code === '');
  // const isValidName = name.trim().length > 0;
  // const isValidPassword =
  //   password.trim().length > 0 || (isExisting && password === '');
  // const canSave = isValidName && isValidCode && isValidPassword;

  const storesDraft = useSiteStoresDraft(id, isNew);

  const handleClose = () => {
    onClose();
  };

  // const handleOk = async () => {
  //   await upsert(storesDraft.save);
  // };

  return (
    <Modal
      title={isExisting ? t('title.edit-site') : t('title.create-site')}
      cancelButton={<DialogButton variant="cancel" onClick={handleClose} />}
    // deleteButton={
    //   isExisting ? (
    //     <DialogButton variant="delete" onClick={onDelete} />
    //   ) : undefined
    // }
    // okButton={
    //   <DialogButton variant="ok" onClick={handleOk} disabled={!canSave} />
    // }
    >
      <DetailContainer>
        <Box display="flex" flexDirection="column" gap={2}>
          <InputWithLabelRow
            key="code"
            label={t('label.code')}
            Input={
              <BasicTextInput
                fullWidth
                value={code}
                disabled
                onChange={e => updateDraft({ code: e.target.value })}
                onBlur={e => updateDraft({ code: e.target.value.trim() })}
              />
            }
          />
          <InputWithLabelRow
            key="name"
            label={t('label.name')}
            Input={
              <BasicTextInput
                fullWidth
                value={name}
                disabled
                autoComplete="off"
                onChange={e => updateDraft({ name: e.target.value })}
                onBlur={e => updateDraft({ name: e.target.value.trim() })}
              />
            }
          />
          {/* <InputWithLabelRow
            key="password"
            label={t('label.settings-password')}
            Input={
              <PasswordTextInput
                fullWidth
                value={password}
                required={!isValidPassword}
                placeholder={isExisting ? '••••••••' : undefined}
                autoComplete="new-password"
                onChange={e => updateDraft({ password: e.target.value })}
              />
            }
          /> */}
          {isExisting && (
            <InputWithLabelRow
              key="hardware-id"
              label={t('label.hardware-id')}
              Input={
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="flex-end"
                  gap={0.5}
                  flex={1}
                >
                  <Typography textAlign="right">
                    {clearHardwareId ? '' : hardwareId ?? ''}
                  </Typography>
                  {/* {!clearHardwareId && !!hardwareId && (
                    <IconButton
                      icon={<XCircleIcon fontSize="small" />}
                      label={t('label.clear-hardware-id')}
                      onClick={() => updateDraft({ clearHardwareId: true })}
                    />
                  )} */}
                </Box>
              }
            />
          )}
          <Divider />
          <SiteStoresSection
            siteId={id}
            stores={storesDraft.stores}
            isFetching={storesDraft.isFetching}
            onAddStore={storesDraft.addStore}
            onRemoveStore={storesDraft.removeStore}
          />
        </Box>
      </DetailContainer>
    </Modal>
  );
};
