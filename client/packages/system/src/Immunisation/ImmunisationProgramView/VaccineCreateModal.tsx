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

interface VaccineCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VaccineCreateModal: FC<VaccineCreateModalProps> = ({
  isOpen,
  onClose,
}) => {
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
            {/* <InputLabel>{t('label.demographic-group')}</InputLabel> */}
            {/* <Autocomplete
              fullWidth
              autoFocus
              value={draft.demographicIndicatorId}
              onChange={(_e, selected) =>
                updatePatch({ demographicIndicatorId: selected?.id })
              }
              options={[
                { label: 'an option', key: 1, id: 'id' },
                { label: 'another option', key: 2, id: 'id2' },
              ]}
            /> */}
            {/* <InputLabel>{t('label.coverage-rate')}</InputLabel>
            <BasicTextInput
              fullWidth
              autoFocus
              value={draft.coverageRate}
              onChange={e => updatePatch({ coverageRate: e.target.value })}
            /> */}
            {/* <InputLabel>{t('label.calculated-demand')}</InputLabel>
            <BasicTextInput
              fullWidth
              autoFocus
              value={draft.calculatedDemand}
              onChange={e => updatePatch({ calculatedDemand: e.target.value })}
            /> */}
          </Box>
        </Grid>
      ) : (
        <InlineSpinner />
      )}
    </Modal>
  );
};
