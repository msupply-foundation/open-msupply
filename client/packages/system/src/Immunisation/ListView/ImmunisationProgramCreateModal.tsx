import React, { FC, useState } from 'react';
import {
  useDialog,
  Grid,
  DialogButton,
  useTranslation,
  FnUtils,
  InlineSpinner,
  BasicTextInput,
  Box,
  InputLabel,
} from '@openmsupply-client/common';

interface ImmunisationProgramCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const createNewProgram = (seed?: any | null): any => ({
  id: FnUtils.generateUUID(),
  name: '',
  ...seed,
});

interface UseDraftImmunisationControl {
  draft: any;
  onUpdate: (patch: Partial<any>) => void;
  onSave: () => Promise<void>;
  isLoading: boolean;
}

const useDraftProgram = (): UseDraftImmunisationControl => {
  const [program, setProgram] = useState<any>(() => createNewProgram());

  const onUpdate = (patch: Partial<any>) => {
    setProgram({ ...program, ...patch });
  };

  const onSave = async () => {
    console.info('TODO insert program mutation');
  };

  const isLoading = false;

  return {
    draft: program,
    onUpdate,
    onSave,
    isLoading,
  };
};

export const ImmunisationProgramCreateModal: FC<
  ImmunisationProgramCreateModalProps
> = ({ isOpen, onClose }) => {
  const { Modal } = useDialog({ isOpen, onClose });
  const t = useTranslation(['catalogue']);
  const { draft, onUpdate, onSave, isLoading } = useDraftProgram();
  const isInvalid = !draft.name.trim();

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
      title={t('label.create-new-program')}
    >
      {!isLoading ? (
        <Grid flexDirection="column" display="flex" gap={2}>
          <Box alignItems="center" gap={1}>
            <InputLabel>{t('label.name')}</InputLabel>
            <BasicTextInput
              fullWidth
              autoFocus
              value={draft.name}
              onChange={e => onUpdate({ name: e.target.value })}
            />
          </Box>
        </Grid>
      ) : (
        <InlineSpinner />
      )}
    </Modal>
  );
};
