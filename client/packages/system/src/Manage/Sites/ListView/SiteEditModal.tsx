import React from 'react';
import {
  useTranslation,
  DetailContainer,
  Box,
  useDialog,
  DialogButton,
  InputWithLabelRow,
  BasicTextInput,
  NumericTextInput,
  PasswordTextInput,
  IconButton,
  XCircleIcon,
  Typography,
} from '@openmsupply-client/common';
import { DraftSite } from '../api';

interface SiteEditModalProps {
  site: DraftSite;
  isOpen: boolean;
  onClose: () => void;
  updateDraft: (patch: Partial<DraftSite>) => void;
  upsert: () => Promise<void>;
  onDelete: () => void;
}

export const SiteEditModal = ({
  site,
  isOpen,
  onClose,
  updateDraft,
  upsert,
  onDelete,
}: SiteEditModalProps) => {
  const t = useTranslation();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const { id, code, name, password, clearHardwareId, hardwareId, isNew } = site;
  const isExisting = !isNew;
  const isValidCode = code.trim().length > 0 || (isExisting && code === '');
  const isValidName = name.trim().length > 0;
  const isValidPassword =
    password.trim().length > 0 || (isExisting && password === '');
  const canSave = isValidName && isValidCode && isValidPassword;

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      title={isExisting ? t('title.edit-site') : t('title.create-site')}
      cancelButton={
        <DialogButton variant="cancel" onClick={handleClose} />
      }
      deleteButton={
        isExisting ? (
          <DialogButton variant="delete" onClick={onDelete} />
        ) : undefined
      }
      okButton={
        <DialogButton variant="ok" onClick={upsert} disabled={!canSave} />
      }
    >
      <DetailContainer>
        <Box display="flex" flexDirection="column" gap={2}>
          <InputWithLabelRow
            key="id"
            label={t('label.settings-site-id')}
            Input={
              <NumericTextInput
                fullWidth
                value={id || undefined}
                disabled
              />
            }
          />
          <InputWithLabelRow
            key="code"
            label={t('label.code')}
            Input={
              <BasicTextInput
                fullWidth
                value={code}
                required={!isValidCode}
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
                required={!isValidName}
                autoComplete="off"
                onChange={e => updateDraft({ name: e.target.value })}
                onBlur={e => updateDraft({ name: e.target.value.trim() })}
              />
            }
          />
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
          {isExisting && (
            <InputWithLabelRow
              key="hardware-id"
              label={t('label.hardware-id')}
              Input={
                <Box
                  display="flex"
                  alignItems="center"
                  gap={0.5}
                >
                  <Typography
                    flex={1}
                  >
                    {clearHardwareId ? '' : hardwareId ?? ''}
                  </Typography>
                  {!clearHardwareId && !!hardwareId && (
                    <IconButton
                      icon={<XCircleIcon fontSize="small" />}
                      label={t('label.clear-hardware-id')}
                      onClick={() => updateDraft({ clearHardwareId: true })}
                    />
                  )}
                </Box>
              }
            />
          )}
        </Box>
      </DetailContainer>
    </Modal>
  );
};
