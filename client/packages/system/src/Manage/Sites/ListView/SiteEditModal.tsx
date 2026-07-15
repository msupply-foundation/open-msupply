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
  PasswordTextInput,
  XCircleIcon,
  LoadingButton,
  useConfirmationModal,
  SyncVersionNode,
  Switch,
} from '@openmsupply-client/common';
import { DraftSite, useSiteStoresDraft } from '../api';
import { SiteStoresSection } from './SiteStoresSection';
import { useSync } from '../../../Sync';

interface SiteEditModalProps {
  site: DraftSite;
  isOpen: boolean;
  onClose: () => void;
  updateDraft: (patch: Partial<DraftSite>) => void;
  clearSyncToken: (siteId: number) => Promise<unknown>;
  isClearingSyncToken: boolean;
  clearHardwareId: (siteId: number) => Promise<unknown>;
  isClearingHardwareId: boolean;
  setMultiDevice: (siteId: number, isMultiDevice: boolean) => Promise<unknown>;
  upsert: (afterUpsert: () => Promise<void>) => Promise<void>;
  onDelete: () => void;
  isEditable: boolean;
}

export const SiteEditModal = ({
  site,
  isOpen,
  onClose,
  updateDraft,
  clearSyncToken,
  isClearingSyncToken,
  clearHardwareId,
  isClearingHardwareId,
  setMultiDevice,
  upsert,
  onDelete,
  isEditable,
}: SiteEditModalProps) => {
  const t = useTranslation();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const {
    id,
    code,
    name,
    password,
    hardwareId,
    syncVersion,
    isMultiDevice,
    isNew,
  } = site;
  const isExisting = !isNew;
  const { data: syncSettings } = useSync.settings.syncSettings();
  const currentSiteId = syncSettings?.syncSiteId;
  // Hardware id / token are only safe to clear once the site has transitioned to
  // v7 (legacy v5/v6 sites still manage these via 4D). See issue #11784.
  const isV7 = syncVersion === SyncVersionNode.V7;
  const showClearButtons =
    currentSiteId != null && currentSiteId !== id && isV7;

  const isValidCode = code.trim().length > 0 || (isExisting && code === '');
  const isValidName = name.trim().length > 0;
  const isValidPassword =
    password.trim().length > 0 || (isExisting && password === '');
  const canSave = isValidName && isValidCode && isValidPassword;

  const storesDraft = useSiteStoresDraft(id, isNew);
  const hasStores = storesDraft.stores.length > 0;

  const handleClose = () => {
    onClose();
  };

  const confirmClearSyncToken = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-clear-sync-token'),
    onConfirm: () => clearSyncToken(id),
  });

  const confirmClearHardwareId = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-clear-hardware-id'),
    onConfirm: () => clearHardwareId(id),
  });

  const confirmSetMultiDevice = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-set-multi-device'),
    onConfirm: () => setMultiDevice(id, !isMultiDevice),
  });

  const handleOk = async () => {
    await upsert(storesDraft.save);
  };

  return (
    <Modal
      title={isExisting ? t('title.edit-site') : t('title.create-site')}
      cancelButton={<DialogButton variant="cancel" onClick={handleClose} />}
      deleteButton={
        isEditable && isExisting ? (
          <DialogButton
            variant="delete"
            onClick={onDelete}
            disabled={hasStores}
          />
        ) : undefined
      }
      okButton={
        isEditable ? (
          <DialogButton variant="ok" onClick={handleOk} disabled={!canSave} />
        ) : undefined
      }
    >
      <DetailContainer>
        <Box display="flex" flexDirection="column" gap={2}>
          <InputWithLabelRow
            key="code"
            label={t('label.code')}
            labelWidth="130px"
            Input={
              <BasicTextInput
                fullWidth
                value={code}
                disabled={!isEditable}
                onChange={e => updateDraft({ code: e.target.value })}
                onBlur={e => updateDraft({ code: e.target.value.trim() })}
              />
            }
          />
          <InputWithLabelRow
            key="name"
            label={t('label.name')}
            labelWidth="130px"
            Input={
              <BasicTextInput
                fullWidth
                value={name}
                disabled={!isEditable}
                autoComplete="off"
                onChange={e => updateDraft({ name: e.target.value })}
                onBlur={e => updateDraft({ name: e.target.value.trim() })}
              />
            }
          />
          {isEditable && (
            <InputWithLabelRow
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
            />
          )}
          {isExisting && (
            <InputWithLabelRow
              key="sync-version"
              label={t('label.sync-version')}
              labelWidth="130px"
              Input={
                <BasicTextInput fullWidth value={syncVersion ?? ''} disabled />
              }
            />
          )}
          {isExisting && (
            <InputWithLabelRow
              key="hardware-id"
              label={t('label.hardware-id')}
              labelWidth="130px"
              Input={
                <Box display="flex" alignItems="center" gap={1} width="100%">
                  <BasicTextInput
                    fullWidth
                    sx={{ flex: 1, minWidth: 0 }}
                    value={hardwareId ?? ''}
                    disabled
                  />
                  {/* Standalone COMS or non-standalone, 
                  COMS is now responsible for managing ROMS hardware ids */}
                  {showClearButtons && !!hardwareId && (
                    <LoadingButton
                      color="secondary"
                      variant="contained"
                      startIcon={<XCircleIcon />}
                      isLoading={isClearingHardwareId}
                      label={t('label.clear-hardware-id')}
                      onClick={() => confirmClearHardwareId()}
                      sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                    />
                  )}
                </Box>
              }
            />
          )}
          {/* Token is solely managed by COMS, so show regardless of standalone */}
          {isExisting && showClearButtons && (
            <InputWithLabelRow
              key="sync-token"
              label={t('label.clear-sync-token')}
              labelWidth="130px"
              Input={
                <Box display="flex" justifyContent="flex-end" flex={1}>
                  <LoadingButton
                    color="secondary"
                    variant="contained"
                    startIcon={<XCircleIcon />}
                    isLoading={isClearingSyncToken}
                    label={t('label.clear-sync-token')}
                    onClick={() => confirmClearSyncToken()}
                  />
                </Box>
              }
            />
          )}
          {/* Multi device, like the token, is managed by COMS */}
          {isExisting && showClearButtons && (
            <InputWithLabelRow
              key="multi-device"
              label={t('label.multi-device')}
              labelWidth="130px"
              Input={
                <Box display="flex" justifyContent="flex-end" flex={1}>
                  <Switch
                    checked={isMultiDevice}
                    onChange={() => confirmSetMultiDevice()}
                    // Don't allow a multi device site to become a single device site again
                    // TODO: Need to implement re-syncing of skipped changelog entries - #12401
                    disabled={isMultiDevice}
                  />
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
            isEditable={isEditable}
          />
        </Box>
      </DetailContainer>
    </Modal>
  );
};
