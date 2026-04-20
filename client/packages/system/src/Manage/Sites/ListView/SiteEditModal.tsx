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
} from '@openmsupply-client/common';
import { DraftSite } from '../api';

interface SiteEditModalProps {
  site: DraftSite;
  isOpen: boolean;
  onClose: () => void;
  updateDraft: (patch: Partial<DraftSite>) => void;
  upsert: () => Promise<void>;
}

export const SiteEditModal = ({
  site,
  isOpen,
  onClose,
  updateDraft,
  upsert,
}: SiteEditModalProps) => {
  const t = useTranslation();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const { id, code, name, password, clearHardwareId, hardwareId, isNew } = site;
  const isExisting = !isNew;
  const isValidCode = code.trim().length > 0 || (isExisting && code === '');
  const isValidPassword =
    password.trim().length > 0 || (isExisting && password === '');
  const canSave = name?.trim().length > 0 && isValidCode && isValidPassword;

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      title={isExisting ? t('title.edit-site') : t('title.create-site')}
      cancelButton={
        <DialogButton variant="cancel" onClick={handleClose} />
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
                sx={{ width: 250 }}
                value={id || undefined}
                disabled={isExisting}
                onChange={value =>
                  updateDraft({ id: value ?? 0 })
                }
              />
            }
          />
          <InputWithLabelRow
            key="code"
            label={t('label.code')}
            Input={
              <BasicTextInput
                sx={{ width: 250 }}
                value={code}
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
                sx={{ width: 250 }}
                value={name}
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
                sx={{ width: 250 }}
                value={password}
                placeholder={isExisting ? '••••••••' : undefined}
                onChange={e => updateDraft({ password: e.target.value })}
              />
            }
          />
          {isExisting && (
            <InputWithLabelRow
              key="hardware-id"
              label={t('label.hardware-id')}
              Input={
                <BasicTextInput
                  sx={{ width: 250 }}
                  value={clearHardwareId ? '' : hardwareId ?? ''}
                  disabled
                  slotProps={{
                    input: {
                      endAdornment: (
                        <IconButton
                          icon={<XCircleIcon fontSize="small" />}
                          label={t('label.clear-hardware-id')}
                          onClick={() =>
                            updateDraft({ clearHardwareId: true })
                          }
                        />
                      ),
                    },
                  }}
                />
              }
            />
          )}
        </Box>
      </DetailContainer>
    </Modal>
  );
};
