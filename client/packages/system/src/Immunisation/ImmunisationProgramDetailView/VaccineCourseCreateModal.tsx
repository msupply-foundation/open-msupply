import React from 'react';
import {
  useDialog,
  Grid,
  DialogButton,
  useTranslation,
  InlineSpinner,
  BasicTextInput,
  Box,
  InputLabel,
  useNavigate,
  RouteBuilder,
} from '@openmsupply-client/common';
import { useVaccineCourse } from '../api/hooks/useVaccineCourse';
import { AppRoute } from '@openmsupply-client/config';

interface VaccineCourseCreateModalModalProps {
  isOpen: boolean;
  onClose: () => void;
  programId: string | undefined;
}

export const VaccineCourseCreateModal = ({
  isOpen,
  onClose,
  programId,
}: VaccineCourseCreateModalModalProps) => {
  const { Modal } = useDialog({ isOpen, onClose });
  const t = useTranslation(['coldchain']);
  const navigate = useNavigate();
  const {
    query: { isLoading },
    draft,
    updatePatch,
    create: { create },
  } = useVaccineCourse();
  const isInvalid = !draft.name.trim();

  const onOk = async () => {
    try {
      const result = await create(programId ?? '');
      if (!result) return;

      const response = result.centralServer?.vaccineCourse?.insertVaccineCourse;
      if (response?.__typename !== 'VaccineCourseNode') return;

      navigate(
        RouteBuilder.create(AppRoute.Programs)
          .addPart(AppRoute.ImmunisationPrograms)
          .addPart(response.programId)
          .addPart(response.id)
          .build()
      );
    } catch (e) {
      // Should ideally just just catch `Permission Denied` as it's handled in graphql client
      console.error(e);
      return;
    }
  };

  return (
    <Modal
      okButton={
        <DialogButton variant="ok" disabled={isInvalid} onClick={onOk} />
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
