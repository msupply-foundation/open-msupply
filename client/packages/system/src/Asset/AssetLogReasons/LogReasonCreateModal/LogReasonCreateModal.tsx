import React, { FC, useState } from 'react';
import {
  useDialog,
  Grid,
  DialogButton,
  useTranslation,
  FnUtils,
  InlineSpinner,
  BasicTextInput,
  Autocomplete,
  Box,
  InputLabel,
  AutocompleteOnChange,
  InsertAssetLogReasonInput,
  AssetLogStatusInput,
  useNotification,
} from '@openmsupply-client/common';
import { checkLogReasonStatus, useAssetLogReason } from '../../api';
import { getStatusInputOptions } from '../../utils';

type AssetLogStatus = {
  label: string;
  value: AssetLogStatusInput;
};

interface LogReasonCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  logReason: InsertAssetLogReasonInput | null;
}

const createNewLogReason = (
  seed?: InsertAssetLogReasonInput | null
): InsertAssetLogReasonInput => ({
  assetLogStatus: AssetLogStatusInput.Functioning,
  id: FnUtils.generateUUID(),
  reason: '',
  ...seed,
});

interface UseDraftLogReasonControl {
  draft: InsertAssetLogReasonInput;
  onUpdate: (patch: Partial<InsertAssetLogReasonInput>) => void;
  onSave: () => Promise<void>;
  isLoading: boolean;
}

const useDraftLogReason = (
  seed: InsertAssetLogReasonInput | null
): UseDraftLogReasonControl => {
  const [logReason, setLogReason] = useState<InsertAssetLogReasonInput>(() =>
    createNewLogReason(seed)
  );
  const {
    create: { create: insert, isCreating },
  } = useAssetLogReason();

  const onUpdate = (patch: Partial<InsertAssetLogReasonInput>) => {
    setLogReason({ ...logReason, ...patch });
  };

  const onSave = async () => {
    insert(logReason);
  };

  return {
    draft: logReason,
    onUpdate,
    onSave,
    isLoading: isCreating,
  };
};

export const LogReasonCreateModal: FC<LogReasonCreateModalProps> = ({
  isOpen,
  onClose,
  logReason,
}) => {
  const { Modal } = useDialog({ isOpen, onClose });
  const t = useTranslation();
  const { draft, onUpdate, onSave, isLoading } = useDraftLogReason(logReason);
  const isInvalid = !draft.reason.trim();
  const { info } = useNotification();

  const updateStatus: AutocompleteOnChange<AssetLogStatus> = (_, option) => {
    if (!option) {
      return;
    }
    onUpdate({ assetLogStatus: option.value });
  };

  return (
    <Modal
      okButton={
        <DialogButton
          variant="ok"
          disabled={isInvalid}
          onClick={async () => {
            // The default enum value 'NotInUse' will not be used, as it will fail the checkStatus validation first.
            if (checkLogReasonStatus(draft.assetLogStatus))
              info(t('error.no-status-provided-for-asset-log-reason'))();
            else {
              await onSave();
              onClose();
            }
          }}
        />
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      title={t('label.create-log-reason')}
    >
      {!isLoading ? (
        <Grid flexDirection="column" display="flex" gap={2}>
          <Box alignItems="center" gap={1}>
            <InputLabel>{t('label.reason')}</InputLabel>
            <BasicTextInput
              fullWidth
              autoFocus
              value={draft.reason}
              onChange={e => onUpdate({ reason: e.target.value })}
            />
          </Box>

          <Box alignItems="center" gap={1}>
            <InputLabel>{t('label.status')}</InputLabel>
            <Autocomplete
              isOptionEqualToValue={(option, value) =>
                option.value === value.value
              }
              width="150px"
              popperMinWidth={150}
              options={getStatusInputOptions(t)}
              onChange={updateStatus}
            />
          </Box>
        </Grid>
      ) : (
        <InlineSpinner />
      )}
    </Modal>
  );
};
