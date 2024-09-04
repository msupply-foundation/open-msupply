import {
  BasicSpinner,
  Box,
  Container,
  DialogButton,
  Grid,
  InputWithLabelRow,
  Radio,
  RadioGroup,
  useDialog,
  useKeyboardHeightAdjustment,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { FormControlLabel } from '@mui/material';
import React from 'react';
import { useVaccination } from '../api';
import { ClinicianSearchInput } from '../../Clinician';
import { StockItemSearchInput } from '../../Item';

interface VaccinationModalProps {
  vaccinationId: string | undefined;
  vaccineCourseDoseId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const VaccinationModal = ({
  isOpen,
  onClose,
  vaccineCourseDoseId,
  vaccinationId,
}: VaccinationModalProps) => {
  const t = useTranslation('dispensary');
  const { success, error } = useNotification();
  const {
    draft,
    // update: { update },
    // create: { create },
    updateDraft,
    query: { isLoading },
    // isDirty,
    // setIsDirty,
  } = useVaccination({ vaccineCourseDoseId, vaccinationId });

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const height = useKeyboardHeightAdjustment(700);

  // TODO
  const save = async () => {
    // setIsDirty(false);

    try {
      // const result =
      //   !!vaccinationId
      //     ? await update()
      //     : await create(programId ?? '');
      // if (result?.__typename === 'VaccineCourseNode') {
      //   const message =
      //     !!vaccinationId
      //       ? `${t('messages.updated-new-vaccine-course')}: ${result.name}`
      //       : `${t('messages.created-new-vaccine-course')}: ${result.name}`;
      success(message)();
      onClose();
      // }
    } catch (e) {
      error(t('error.failed-to-save-vaccine-course'))();
      console.error(e);
    }
  };

  const modalContent =
    !draft || isLoading ? (
      <BasicSpinner />
    ) : (
      <Box display="flex" flex={1}>
        <Container>
          <InputWithLabelRow
            label={t('label.clinician')}
            Input={
              <Grid item flex={1}>
                <ClinicianSearchInput
                  onChange={clinician => {
                    updateDraft({
                      clinician,
                    });
                  }}
                  clinicianLabel={draft.clinician?.label || ''}
                  clinicianValue={draft.clinician?.value}
                />
              </Grid>
            }
          />

          <RadioGroup
            value={draft.given}
            onChange={event => {
              updateDraft({ given: event.target.value === 'true' });
              //
            }}
          >
            <FormControlLabel
              value={true}
              control={<Radio />}
              label={t('label.vaccine-given')}
            />
            <FormControlLabel
              value={false}
              control={<Radio />}
              label={t('label.vaccine-not-given')}
            />
          </RadioGroup>

          <InputWithLabelRow
            label={t('label.vaccine-item')}
            Input={
              <Grid item flex={1}>
                {/* PROBS JUST AS EASY TO RENDER THE ITEMS BOO */}
                <StockItemSearchInput
                  onChange={x => console.log(x)}
                  // extraFilter={item => courseItems.find(i => i.id === item.id)}
                />
              </Grid>
            }
          />
          <InputWithLabelRow label={t('label.batch')} Input={'TODO'} />
        </Container>
      </Box>
    );

  return (
    <Modal
      title={draft.label}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          // disabled={!isDirty || !programId} // TODO? prog
          variant="ok"
          onClick={save}
        />
      }
      height={height}
      width={750}
      slideAnimation={false}
    >
      {modalContent}
    </Modal>
  );
};
