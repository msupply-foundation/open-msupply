import React, { useState } from 'react';
import {
  useTranslation,
  DetailContainer,
  Box,
  useDialog,
  DialogButton,
  InputWithLabelRow,
  Checkbox,
  Typography,
  useNotification,
} from '@openmsupply-client/common';
import { ReportWithVersionRowFragment } from '../api/operations.generated';

interface ReportEditModalProps {
  report: ReportWithVersionRowFragment;
  isOpen: boolean;
  onClose: () => void;
  update: (input: { id: string; isActive: boolean }) => Promise<unknown>;
  isUpdating: boolean;
}

export const ReportEditModal = ({
  report,
  isOpen,
  onClose,
  update,
  isUpdating,
}: ReportEditModalProps) => {
  const t = useTranslation();
  const { success, error } = useNotification();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const [isActive, setIsActive] = useState(report.isActive);

  const hasChanged = isActive !== report.isActive;

  const save = async () => {
    try {
      await update({ id: report.id, isActive });
      success(t('messages.saved'))();
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      error(message)();
    }
  };

  return (
    <Modal
      title={t('title.edit-report')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          variant="save"
          onClick={save}
          disabled={!hasChanged || isUpdating}
        />
      }
    >
      <DetailContainer>
        <Box display="flex" flexDirection="column" gap={2}>
          <InputWithLabelRow
            labelWidth="120px"
            label={t('label.name')}
            Input={<Typography>{report.name}</Typography>}
          />
          <InputWithLabelRow
            labelWidth="120px"
            label={t('label.version')}
            Input={<Typography>{report.version}</Typography>}
          />
          <InputWithLabelRow
            labelWidth="120px"
            label={t('label.custom')}
            Input={
              <Typography>
                {report.isCustom ? t('messages.yes') : t('messages.no')}
              </Typography>
            }
          />
          <InputWithLabelRow
            labelWidth="120px"
            label={t('label.enabled')}
            Input={
              <Checkbox
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
              />
            }
          />
        </Box>
      </DetailContainer>
    </Modal>
  );
};
