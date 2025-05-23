import { DialogButton, InputWithLabelRow, TextArea } from '@common/components';
import { useDialog } from '@common/hooks';
import { Box, FnUtils, useTranslation } from '@openmsupply-client/common';
import React, { ReactElement, useEffect, useState } from 'react';
import {
  useVvmStatusesEnabled,
  useVvmStatusLog,
  VvmStatusLogRowFragment,
} from '../../api';
import { VVMStatusSearchInput } from '../VVMStatusSearchInput';

interface VvmStatusLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockLineId?: string;
  selectedStatusLog?: VvmStatusLogRowFragment;
}

export const VvmStatusLogModal = ({
  isOpen,
  onClose,
  stockLineId,
  selectedStatusLog,
}: VvmStatusLogModalProps): ReactElement => {
  const t = useTranslation();
  const isCreating = !selectedStatusLog;
  const [comment, setComment] = useState<string>('');
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const {
    create: { createMutation },
    update: { updateMutation },
  } = useVvmStatusLog();
  const { data: vvmStatus = [] } = useVvmStatusesEnabled();

  const handleConfirm = () => {
    if (isCreating && stockLineId && selectedStatusId)
      createMutation({
        id: FnUtils.generateUUID(),
        stockLineId,
        statusId: selectedStatusId,
        comment,
      });

    if (!isCreating && selectedStatusLog)
      updateMutation({
        id: selectedStatusLog.id,
        comment,
      });

    onClose();
  };

  useEffect(() => {
    const selectedVvmStatus = vvmStatus.find(
      ({ id }) => id === selectedStatusLog?.status?.id
    );

    const vvmStatusOption = selectedVvmStatus ? selectedVvmStatus.id : null;
    setSelectedStatusId(vvmStatusOption);
    setComment(selectedStatusLog?.comment ?? '');
  }, [selectedStatusLog, vvmStatus]);

  return (
    <Modal
      width={400}
      title={
        isCreating ? t('label.add-vvm-status') : t('label.edit-vvm-status')
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={<DialogButton variant="ok" onClick={handleConfirm} />}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <InputWithLabelRow
          label={t('label.vvm-status')}
          Input={
            <VVMStatusSearchInput
              selectedId={selectedStatusId ?? null}
              onChange={variantId => setSelectedStatusId(variantId)}
              disabled={!isCreating}
            />
          }
          sx={{
            '& .MuiAutocomplete-root': { flexGrow: 1, borderRadius: 1 },
          }}
        />
        <InputWithLabelRow
          label={t('label.comment')}
          Input={
            <TextArea
              value={comment}
              autoFocus={!isCreating}
              onChange={e => setComment(e.target.value)}
              slotProps={{
                input: {
                  sx: {
                    backgroundColor: theme => theme.palette.background.drawer,
                  },
                },
              }}
            />
          }
          sx={{
            '& > :last-child': { flexGrow: 1 },
          }}
        />
      </Box>
    </Modal>
  );
};
