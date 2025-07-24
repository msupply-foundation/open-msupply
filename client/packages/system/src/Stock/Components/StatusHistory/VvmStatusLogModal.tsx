import { DialogButton, InputWithLabelRow, TextArea } from '@common/components';
import { useDialog } from '@common/hooks';
import { Box, FnUtils, useTranslation } from '@openmsupply-client/common';
import React, { ReactElement, useEffect, useState } from 'react';
import {
  useVvmStatusesEnabled,
  useVvmStatusLog,
  VvmStatusFragment,
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
  const [selectedStatus, setSelectedStatus] =
    useState<VvmStatusFragment | null>();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const {
    create: { createMutation },
    update: { updateMutation },
  } = useVvmStatusLog();
  const { data: vvmStatus = [] } = useVvmStatusesEnabled();

  const handleConfirm = () => {
    if (isCreating && stockLineId && selectedStatus)
      createMutation({
        id: FnUtils.generateUUID(),
        stockLineId,
        statusId: selectedStatus.id,
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
    setSelectedStatus(selectedVvmStatus);
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
              selected={selectedStatus ?? null}
              onChange={vvmStatus => setSelectedStatus(vvmStatus)}
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
