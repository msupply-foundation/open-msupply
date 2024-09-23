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
  useEditModal,
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
import { SelectBatchModal } from './SelectBatchModal';
import { AppRoute } from '@openmsupply-client/config';
import { ArrowRightIcon } from '@mui/x-date-pickers';
import { FacilitySearchInput, OTHER_FACILITY } from './FacilitySearchInput';
import { SelectItemAndBatch } from './SelectItemAndBatch';

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
  const t = useTranslation('dispensary');
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

  const {
    isOpen: batchModalOpen,
    onClose: closeBatchModal,
    onOpen: openBatchModal,
  } = useEditModal();

  const save = async () => {
    try {
      await saveVaccination(draft);
      success(t('messages.vaccination-saved'))();
      onClose();
    } catch (e) {
      error(t('error.failed-to-save-vaccination'))();
      console.error(e);
    }
  };

  const InfoBox = <GivenInfoBox vaccination={vaccination} />;

  const modalContent = isLoading ? (
    <BasicSpinner />
  ) : (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {InfoBox}
      <VaccinationForm
        updateDraft={updateDraft}
        openBatchModal={openBatchModal}
        draft={draft}
        dose={dose}
        existingSelectedBatch={vaccination?.stockLine?.id}
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
      <>
        {batchModalOpen && (
          <SelectBatchModal
            isOpen
            itemId={draft.itemId ?? ''}
            onClose={closeBatchModal}
            stockLine={draft.stockLine ?? null}
            setStockLine={stockLine => updateDraft({ stockLine })}
          />
        )}
        {modalContent}
      </>
    </Modal>
  );
};

const VaccinationForm = ({
  draft,
  dose,
  existingSelectedBatch,
  updateDraft,
  openBatchModal,
}: {
  dose?: VaccinationCourseDoseFragment;
  draft: VaccinationDraft;
  existingSelectedBatch?: string;
  updateDraft: (update: Partial<VaccinationDraft>) => void;
  openBatchModal: () => void;
}) => {
  const t = useTranslation('dispensary');

  if (!dose) {
    return null;
  }

  const shouldNotCreateInvoice =
    draft.facilityId === OTHER_FACILITY || draft.given === false;
  const stockLineChanged =
    draft.given && draft.stockLine?.id !== existingSelectedBatch;

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

            {draft.facilityId === OTHER_FACILITY && (
              <BasicTextInput
                fullWidth
                autoFocus
                value={draft.facilityFreeText}
                onChange={e =>
                  updateDraft({ facilityFreeText: e.target.value })
                }
                sx={{ flex: 1, marginTop: 0.3 }}
              />
            )}
          </Grid>
        }
      />
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

      <SelectItemAndBatch
        dose={dose}
        draft={draft}
        openBatchModal={openBatchModal}
        updateDraft={updateDraft}
        hasExistingSelectedBatch={!!existingSelectedBatch}
      />

      {/* TODO: not given to given! no selected */}
      {existingSelectedBatch &&
        (shouldNotCreateInvoice || stockLineChanged) && (
          // ask whether to update the transactions
          <Switch
            label={
              shouldNotCreateInvoice
                ? t('label.revert-existing-transaction')
                : t('label.update-transactions')
            }
            checked={draft.editExistingTransactions}
            onChange={() =>
              updateDraft({
                editExistingTransactions: !draft.editExistingTransactions,
              })
            }
            labelPlacement="end"
            size="small"
          />
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
  const t = useTranslation('dispensary');
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
