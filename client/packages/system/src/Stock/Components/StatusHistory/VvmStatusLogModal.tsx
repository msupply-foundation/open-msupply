import {
  Autocomplete,
  DialogButton,
  InputWithLabelRow,
  TextArea,
} from '@common/components';
import { useDialog } from '@common/hooks';
import { Box, FnUtils, useTranslation } from '@openmsupply-client/common';
import React, { ReactElement, useEffect, useState } from 'react';
import {
  useVvmStatusList,
  useVvmStatusLog,
  VvmStatusLogRowFragment,
} from '../../api';

interface VvmStatusOption {
  label: string;
  value: string;
}

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
  const [selectedVvmStatusOption, setSelectedVvmStatusOption] =
    useState<VvmStatusOption | null>();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const {
    create: { createMutation },
    update: { updateMutation },
  } = useVvmStatusLog();
  const {
    query: { data: vvmStatus },
  } = useVvmStatusList();

  const options = vvmStatus.map(({ id, code }) => ({
    label: code,
    value: id,
  }));

  const handleConfirm = () => {
    if (isCreating && stockLineId && selectedVvmStatusOption)
      createMutation({
        id: FnUtils.generateUUID(),
        stockLineId,
        statusId: selectedVvmStatusOption.value,
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

    const vvmStatusOption = selectedVvmStatus
      ? { label: selectedVvmStatus.code, value: selectedVvmStatus.id }
      : null;
    setSelectedVvmStatusOption(vvmStatusOption);
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
            <Autocomplete
              options={options}
              required={isCreating}
              disabled={!isCreating}
              disableClearable={false}
              value={selectedVvmStatusOption}
              getOptionLabel={option => option.label}
              onChange={(_, value) => setSelectedVvmStatusOption(value)}
              isOptionEqualToValue={(option, value) =>
                option.value === value.value
              }
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
