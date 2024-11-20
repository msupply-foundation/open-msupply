import {
  Alert,
  BasicSpinner,
  BasicTextInput,
  Box,
  Container,
  DatePicker,
  DialogButton,
  Grid,
  InputWithLabelRow,
  Link,
  Radio,
  RadioGroup,
  RouteBuilder,
  Select,
  Switch,
  useDialog,
  useFormatDateTime,
  useKeyboardHeightAdjustment,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { FormControlLabel } from '@mui/material';
import React from 'react';
import { useVaccination, VaccinationDraft } from '../api';
import { Clinician, ClinicianSearchInput } from '../../Clinician';
import {
  VaccinationCourseDoseFragment,
  VaccinationDetailFragment,
} from '../api/operations.generated';
import { AppRoute } from '@openmsupply-client/config';
import { ArrowRightIcon } from '@mui/x-date-pickers';
import { FacilitySearchInput, OTHER_FACILITY } from './FacilitySearchInput';
import { SelectItemAndBatch } from './SelectItemAndBatch';
import { getSwitchReason } from './getSwitchReason';
import { useConfirmNoStockLineSelected } from './useConfirmNoStockLineSelected';

interface VaccinationModalProps {
  vaccinationId: string | undefined;
  encounterId?: string;
  vaccineCourseDoseId: string;
  isOpen: boolean;
  onClose: () => void;
  defaultClinician?: Clinician;
}

export const VaccinationModal = ({
  isOpen,
  onClose,
  vaccineCourseDoseId,
  encounterId,
  vaccinationId,
  defaultClinician,
}: VaccinationModalProps) => {
  const t = useTranslation();
  const { success, error } = useNotification();
  const {
    draft,
    updateDraft,
    query: { dose, vaccination, isLoading },
    isDirty,
    isComplete,
    saveVaccination,
  } = useVaccination({
    encounterId,
    vaccineCourseDoseId,
    vaccinationId,
    defaultClinician,
  });

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const height = useKeyboardHeightAdjustment(700);

  const save = useConfirmNoStockLineSelected(
    draft,
    !!dose?.vaccineCourse.vaccineCourseItems?.length,
    async () => {
      try {
        const result = await saveVaccination(draft);

        if (result?.__typename === 'VaccinationNode') {
          success(t('messages.vaccination-saved'))();
          onClose();
        }

        if (result?.__typename === 'UpdateVaccinationError') {
          if (result.error.__typename === 'NotMostRecentGivenDose') {
            const errorSnack = error(t('error.not-most-recent-given-dose'));
            errorSnack();
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  );

  const InfoBox = <GivenInfoBox vaccination={vaccination} />;

  const modalContent = isLoading ? (
    <BasicSpinner />
  ) : (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {InfoBox}
      <VaccinationForm
        updateDraft={updateDraft}
        draft={draft}
        dose={dose}
        vaccination={vaccination}
      />
    </Box>
  );

  return (
    <Modal
      title={dose?.label ?? t('label.vaccination')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          disabled={!isDirty || !isComplete}
          variant="ok"
          onClick={save}
        />
      }
      height={height}
      width={550}
      slideAnimation={false}
      contentProps={{ sx: { paddingTop: !!InfoBox ? 0 : undefined } }}
    >
      <>{modalContent}</>
    </Modal>
  );
};

const VaccinationForm = ({
  draft,
  dose,
  vaccination,
  updateDraft,
}: {
  dose?: VaccinationCourseDoseFragment;
  draft: VaccinationDraft;
  vaccination?: VaccinationDetailFragment | null;
  updateDraft: (update: Partial<VaccinationDraft>) => void;
}) => {
  const t = useTranslation();

  if (!dose) {
    return null;
  }

  const transactionSwitchReason = getSwitchReason(
    draft,
    !!dose.vaccineCourse.vaccineCourseItems?.length,
    vaccination
  );
  const CreateTransactions = transactionSwitchReason ? (
    <Switch
      label={t(transactionSwitchReason)}
      checked={draft.createTransactions}
      onChange={() =>
        updateDraft({
          createTransactions: !draft.createTransactions,
        })
      }
      labelPlacement="end"
      size="small"
    />
  ) : null;

  const SelectBatch = (
    <SelectItemAndBatch
      dose={dose}
      draft={draft}
      updateDraft={updateDraft}
      hasExistingSelectedBatch={!!vaccination?.stockLine}
    />
  );

  const isOtherFacility = draft.facilityId === OTHER_FACILITY;

  return (
    <Container
      maxWidth="xs"
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <InputWithLabelRow
        label={t('label.facility')}
        labelProps={{ sx: { alignSelf: 'start', marginTop: '3px' } }}
        Input={
          <Grid item flex={1}>
            <FacilitySearchInput
              onChange={facilityId =>
                updateDraft({
                  facilityId,
                })
              }
              facilityId={draft.facilityId}
            />

            {isOtherFacility && (
              <BasicTextInput
                fullWidth
                autoFocus
                placeholder={t('placeholder.enter-facility-name')}
                value={draft.facilityFreeText}
                onChange={e =>
                  updateDraft({ facilityFreeText: e.target.value })
                }
                sx={{ flex: 1, marginTop: 2 }}
              />
            )}
          </Grid>
        }
      />
      {!isOtherFacility && (
        <InputWithLabelRow
          label={t('label.clinician')}
          Input={
            <Grid item flex={1}>
              <ClinicianSearchInput
                onChange={clinician => {
                  updateDraft({
                    clinician: clinician?.value,
                  });
                }}
                clinicianValue={draft.clinician}
              />
            </Grid>
          }
        />
      )}
      <InputWithLabelRow
        label={t('label.date')}
        Input={
          <DatePicker
            disableFuture
            value={draft.date}
            onChange={date => updateDraft({ date })}
            sx={{ flex: 1 }}
          />
        }
      />
      <RadioGroup
        sx={{ margin: '0 auto' }}
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

      {/* Switch makes more sense below the batch selection if you're updating the batch */}
      {transactionSwitchReason === 'label.update-transactions' ? (
        <>
          {SelectBatch}
          {CreateTransactions}
        </>
      ) : (
        <>
          {CreateTransactions}
          {SelectBatch}
        </>
      )}

      {draft.given === false && (
        <>
          <InputWithLabelRow
            label={t('label.reason')}
            Input={
              <Select
                options={[
                  // TODO: make the values an enum from backend
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

      {/* Is undefined when not yet set as given true/false */}
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

const GivenInfoBox = ({
  vaccination,
}: {
  vaccination: VaccinationDetailFragment | null | undefined;
}) => {
  const t = useTranslation();
  const { localisedDate } = useFormatDateTime();

  if (vaccination?.given) {
    return (
      <Alert severity="success">
        <Box display="flex" alignItems="center">
          {t('messages.vaccination-was-given', {
            date: localisedDate(vaccination.vaccinationDate ?? ''),
          })}
          {vaccination.invoice && (
            <Link
              style={{
                marginLeft: 6,
                fontWeight: 'bold',
                alignItems: 'center',
                display: 'flex',
              }}
              to={RouteBuilder.create(AppRoute.Dispensary)
                .addPart(AppRoute.Prescription)
                .addPart(vaccination.invoice.invoiceNumber.toString())
                .build()}
            >
              {t('button.view-prescription')}
              <ArrowRightIcon />
            </Link>
          )}
        </Box>
      </Alert>
    );
  }
};
