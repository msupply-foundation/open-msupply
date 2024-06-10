import React, { FC } from 'react';
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
}

export const VaccineCourseCreateModal: FC<
  VaccineCourseCreateModalModalProps
> = ({ isOpen, onClose }) => {
  const { Modal } = useDialog({ isOpen, onClose });
  const t = useTranslation(['coldchain']);
  const {
    query: { isLoading },
    draft,
    updatePatch,
    create: { create },
  } = useVaccineCourse();
  const isInvalid = !draft.name.trim();

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
