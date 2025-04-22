import {
  Alert,
  BasicSpinner,
  BasicTextInput,
  Box,
  ChevronDownIcon,
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
  useAuthContext,
  useDialog,
  useFormatDateTime,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { FormControlLabel, Typography } from '@mui/material';
import React from 'react';
import { useVaccination, VaccinationDraft } from '../api';
import { Clinician, ClinicianSearchInput } from '../../Clinician';
import {
  VaccinationCardItemFragment,
  VaccinationCourseDoseFragment,
  VaccinationDetailFragment,
} from '../api/operations.generated';
import { AppRoute } from '@openmsupply-client/config';
import { FacilitySearchInput, OTHER_FACILITY } from './FacilitySearchInput';
import { SelectItemAndBatch } from './SelectItemAndBatch';
import { useConfirmNoStockLineSelected } from './useConfirmNoStockLineSelected';
import { useClinicians } from '@openmsupply-client/programs';

interface VaccinationModalProps {
  encounterId?: string;
  cardRow: VaccinationCardItemFragment;
  isOpen: boolean;
  onClose: () => void;
  defaultClinician?: Clinician;
  onOk: () => void;
}

export const VaccinationModal = ({
  isOpen,
  onClose,
  encounterId,
  cardRow,
  defaultClinician,
  onOk,
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
    cardRow,
    defaultClinician,
  });

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const save = useConfirmNoStockLineSelected(
    draft,
    !!dose?.vaccineCourse.vaccineCourseItems?.length,
    async () => {
      try {
        const result = await saveVaccination(draft);

        if (result?.__typename === 'VaccinationNode') {
          result?.invoice?.id && draft.createTransactions
            ? success(t('messages.vaccination-saved-and-stock-recorded'))()
            : success(t('messages.vaccination-saved'))();
          onOk();
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

  const InfoBox = <VaccineInfoBox vaccination={vaccination} />;

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
      height={700}
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
  const { store, storeId } = useAuthContext();

  const { data: clinicians } = useClinicians.document.list({});
  const hasClinicians = clinicians?.nodes.length !== 0;

  if (!dose) {
    return null;
  }
  const givenAtOtherStore =
    !!vaccination?.given && vaccination.givenStoreId !== storeId;

  const isFreeTextFacility = draft.facilityId === OTHER_FACILITY;
  const isOtherFacility =
    !!draft.facilityId && draft.facilityId !== store?.nameId;

  return (
    <Container
      maxWidth="xs"
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <InputWithLabelRow
        label={t('label.facility')}
        labelProps={{ sx: { alignSelf: 'start', marginTop: '3px' } }}
        Input={
          <Grid flex={1}>
            <FacilitySearchInput
              onChange={facilityId =>
                updateDraft({
                  facilityId,
                })
              }
              facilityId={draft.facilityId}
              enteredAtOtherFacility={draft.enteredAtOtherFacility}
              disabled={givenAtOtherStore}
            />

            {isFreeTextFacility && (
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
      {hasClinicians && !isOtherFacility && (
        <InputWithLabelRow
          label={t('label.clinician')}
          Input={
            <Grid flex={1}>
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
            disabled={givenAtOtherStore}
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
          updateDraft({
            given: event.target.value === 'true',
            // Ensure current facility is selected when changing given status
            facilityId: isFreeTextFacility ? OTHER_FACILITY : store?.nameId,
          })
        }
      >
        <FormControlLabel
          disabled={givenAtOtherStore}
          value={true}
          control={<Radio />}
          label={t('label.vaccine-given')}
        />
        <FormControlLabel
          disabled={givenAtOtherStore}
          value={false}
          control={<Radio />}
          label={t('label.vaccine-not-given')}
        />
      </RadioGroup>

      <SelectItemAndBatch
        draft={draft}
        vaccination={vaccination}
        isOtherFacility={isOtherFacility}
        dose={dose}
        updateDraft={updateDraft}
        givenAtOtherStore={givenAtOtherStore}
      />

      {draft.given === false && (
        <>
          <InputWithLabelRow
            label={t('label.reason')}
            Input={
              <Box sx={{ display: 'flex', width: 275 }}>
                <Select
                  options={[
                    // TODO: make the values an enum from backend
                    { label: t('label.refused'), value: 'REFUSED' },
                    { label: t('label.out-of-stock'), value: 'OUT_OF_STOCK' },
                    { label: t('label.no-reason'), value: 'NO_REASON' },
                  ]}
                  value={draft.notGivenReason ?? ''}
                  onChange={e =>
                    updateDraft({ notGivenReason: e.target.value })
                  }
                  sx={{ flex: 1 }}
                />
                <Box width={2}>
                  <Typography
                    sx={{
                      color: 'primary.light',
                      fontSize: '17px',
                      marginLeft: 0.5,
                      marginBottom: 2,
                    }}
                  >
                    *
                  </Typography>
                </Box>
              </Box>
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

const VaccineInfoBox = ({
  vaccination,
}: {
  vaccination: VaccinationDetailFragment | null | undefined;
}) => {
  const t = useTranslation();
  const { localisedDate } = useFormatDateTime();
  const { store } = useAuthContext();
  const prescriptionCreatedAtStore = vaccination?.givenStoreId === store?.id;

  return vaccination?.given ? (
    <Alert severity="success">
      <Box display="flex" alignItems="center">
        {t('messages.vaccination-was-given', {
          date: localisedDate(vaccination.vaccinationDate ?? ''),
        })}
        {vaccination.invoice && prescriptionCreatedAtStore && (
          <Link
            style={{
              marginLeft: 6,
              fontWeight: 'bold',
              alignItems: 'center',
              display: 'flex',
            }}
            to={RouteBuilder.create(AppRoute.Dispensary)
              .addPart(AppRoute.Prescription)
              .addPart(vaccination.invoice.id)
              .build()}
          >
            {t('button.view-prescription')}
            <ChevronDownIcon
              sx={{
                transform: 'rotate(-90deg)',
              }}
            />
          </Link>
        )}
      </Box>
    </Alert>
  ) : (
    <Alert severity="warning">{t('warning.check-before-vaccinating')}</Alert>
  );
};
