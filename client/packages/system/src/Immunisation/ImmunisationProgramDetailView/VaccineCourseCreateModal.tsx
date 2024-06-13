import React, { FC, useEffect } from 'react';
import {
  useDialog,
  Grid,
  DialogButton,
  useTranslation,
  InlineSpinner,
  BasicTextInput,
  Box,
  InputLabel,
} from '@openmsupply-client/common';
import { useVaccineCourse } from '../api/hooks/useVaccineCourse';

interface VaccineCourseCreateModalModalProps {
  isOpen: boolean;
  onClose: () => void;
  programId: string | undefined;
}

export const VaccineCourseCreateModal: FC<
  VaccineCourseCreateModalModalProps
> = ({ isOpen, onClose, programId }) => {
  const { Modal } = useDialog({ isOpen, onClose });
  const t = useTranslation(['coldchain']);
  const {
    query: { isLoading },
    draft,
    updatePatch,
    create: { create },
  } = useVaccineCourse(programId);
  const isInvalid = !draft.name.trim();

  useEffect(() => {
    updatePatch({ programId: programId });
  }, [programId, updatePatch]);

  return (
    <Modal
      okButton={
        <DialogButton
          variant="ok"
          disabled={isInvalid}
          onClick={async () => {
            await create();
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
              onChange={e => updatePatch({ name: e.target.value })}
            />
          </Box>
        </Grid>
      ) : (
        <InlineSpinner />
      )}
    </Modal>
  );
};
