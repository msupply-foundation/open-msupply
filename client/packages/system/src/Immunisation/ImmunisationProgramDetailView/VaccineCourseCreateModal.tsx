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

interface VaccineCourseCreateModalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const createNewVaccineCourse = (seed?: any | null): any => ({
  id: FnUtils.generateUUID(),
  name: '',
  ...seed,
});

interface UseDraftVaccineCourseControl {
  draft: any;
  onUpdate: (patch: Partial<any>) => void;
  onSave: () => Promise<void>;
  isLoading: boolean;
}

const useDraftProgram = (): UseDraftVaccineCourseControl => {
  const [program, setProgram] = useState<any>(() => createNewVaccineCourse());

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

export const VaccineCourseCreateModal: FC<
  VaccineCourseCreateModalModalProps
> = ({ isOpen, onClose }) => {
  const { Modal } = useDialog({ isOpen, onClose });
  const t = useTranslation('coldchain');
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
      title={t('label.add-new-vaccine-course')}
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
