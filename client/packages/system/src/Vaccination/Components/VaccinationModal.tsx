import {
  BasicSpinner,
  BasicTextInput,
  Container,
  DatePicker,
  DialogButton,
  Grid,
  InputWithLabelRow,
  Radio,
  RadioGroup,
  Select,
  useDialog,
  useKeyboardHeightAdjustment,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { FormControlLabel } from '@mui/material';
import React, { useMemo } from 'react';
import { useVaccination, VaccinationDraft } from '../api';
import { Clinician, ClinicianSearchInput } from '../../Clinician';
import { VaccinationCourseDoseFragment } from '../api/operations.generated';

interface VaccinationModalProps {
  vaccinationId: string | undefined;
  vaccineCourseDoseId: string;
  isOpen: boolean;
  onClose: () => void;
  defaultClinician?: Clinician;
}

export const VaccinationModal = ({
  isOpen,
  onClose,
  vaccineCourseDoseId,
  vaccinationId,
  defaultClinician,
}: VaccinationModalProps) => {
  const t = useTranslation('dispensary');
  const { success, error } = useNotification();
  const {
    draft,
    // update: { update },
    // create: { create },
    updateDraft,
    query: { dose, isLoading },
    // isDirty,
    // setIsDirty,
  } = useVaccination({ vaccineCourseDoseId, vaccinationId, defaultClinician });

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const height = useKeyboardHeightAdjustment(620);

  // TODO
  const save = async () => {
    // setIsDirty(false);

    try {
      // const result =
      //   !!vaccinationId
      //     ? await update()
      //     : await create(programId ?? '');
      // if (result?.__typename === 'VaccineCourseNode') {
      success(t('messages.vaccination-saved'))();
      onClose();
      // }
    } catch (e) {
      error(t('error.failed-to-save-vaccination'))();
      console.error(e);
    }
  };

  const modalContent = isLoading ? (
    <BasicSpinner />
  ) : (
    <VaccinationForm updateDraft={updateDraft} draft={draft} dose={dose} />
  );

  return (
    <Modal
      title={dose?.label ?? t('label.vaccination')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          // disabled={!isDirty || !programId} // TODO? prog
          variant="ok"
          onClick={save}
        />
      }
      height={height}
      width={550}
      slideAnimation={false}
    >
      {modalContent}
    </Modal>
  );
};

const VaccinationForm = ({
  draft,
  dose,
  updateDraft,
}: {
  dose?: VaccinationCourseDoseFragment;
  draft?: VaccinationDraft;
  updateDraft: (update: Partial<VaccinationDraft>) => void;
}) => {
  const t = useTranslation('dispensary');

  const vaccineItemOptions = useMemo(() => {
    return (
      dose?.vaccineCourse.vaccineCourseItems?.map(item => ({
        label: item.name,
        value: item.id,
      })) ?? []
    );
  }, [dose?.id]);

  if (!draft || !dose) {
    return null;
  }

  return (
    <Container
      maxWidth="xs"
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
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
      <InputWithLabelRow
        label={t('label.date')}
        Input={
          <DatePicker
            value={draft.date}
            onChange={date => updateDraft({ date })}
            sx={{ flex: 1 }}
          />
        }
      />

      <RadioGroup
        sx={{ margin: '5 auto', width: 'fit-content' }}
        value={draft.given ?? null}
        onChange={event =>
          updateDraft({ given: event.target.value === 'true' })
        }
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

      {draft.given && (
        <>
          <InputWithLabelRow
            label={t('label.vaccine-item')}
            Input={
              <Select
                options={vaccineItemOptions}
                value={draft.itemId ?? ''}
                onChange={e => updateDraft({ itemId: e.target.value })}
                sx={{ flex: 1 }}
              />
            }
          />
          <InputWithLabelRow label={t('label.batch')} Input={'TODO'} />
        </>
      )}

      {draft.given === false && (
        <>
          <InputWithLabelRow
            label={t('label.reason')}
            Input={
              <Select
                options={[
                  // TODO: not hard coded lmao
                  { label: t('label.refused'), value: 'REFUSED' },
                  { label: t('label.out-of-stock'), value: 'OUT_OF_STOCK' },
                  { label: t('label.no-reason'), value: 'NO_REASON' },
                ]}
                value={draft.notGivenReason ?? ''}
                onChange={e => updateDraft({ notGivenReason: e.target.value })}
                sx={{ flex: 1 }}
              />
            }
          />
        </>
      )}

      {/* Is undefined when yet set as given true/false */}
      {draft.given !== undefined && (
        <InputWithLabelRow
          label={t('label.comment')}
          Input={
            <BasicTextInput
              value={draft.comment}
              onChange={e => updateDraft({ comment: e.target.value })}
              multiline
              fullWidth
              rows={3}
              style={{ flex: 1 }}
            />
          }
        />
      )}
    </Container>
  );
};
