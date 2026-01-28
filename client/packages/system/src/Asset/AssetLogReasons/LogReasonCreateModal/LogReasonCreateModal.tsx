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
  AssetLogStatusNodeType,
  Checkbox,
} from '@openmsupply-client/common';
import { useAssetLogReason } from '../../api/hooks/useAssetLogReason';
import { getStatusOptions, parseStatus } from '../../utils';

type AssetLogStatus = {
  label: string;
  value: AssetLogStatusNodeType;
};

interface LogReasonCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  logReason: InsertAssetLogReasonInput | null;
}

const createNewLogReason = (
  seed?: InsertAssetLogReasonInput | null
): InsertAssetLogReasonInput => ({
  assetLogStatus: AssetLogStatusNodeType.Functioning,
  id: FnUtils.generateUUID(),
  reason: '',
  commentsRequired: false,
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
            await onSave();
            onClose();
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
              options={getStatusOptions(t)}
              value={{
                label: parseStatus(draft.assetLogStatus, t),
                value: draft.assetLogStatus,
              }}
              onChange={updateStatus}
            />
          </Box>

          <Box
            display="flex"
            alignItems="center"
            justifyContent="flex-start"
          >
            <Checkbox
              checked={draft.commentsRequired}
              onChange={e => onUpdate({ commentsRequired: e.target.checked })}
            />
            <InputLabel>{t('label.comments-required')}</InputLabel>
          </Box>
        </Grid>
      ) : (
        <InlineSpinner />
      )}
    </Modal>
  );
};
