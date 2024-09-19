import {
  Alert,
  AlertColor,
  BasicSpinner,
  BasicTextInput,
  Box,
  Button,
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
  SxProps,
  useDialog,
  useEditModal,
  useFormatDateTime,
  useKeyboardHeightAdjustment,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { FormControlLabel } from '@mui/material';
import React, { ReactNode, useMemo } from 'react';
import { useVaccination, VaccinationDraft } from '../api';
import { Clinician, ClinicianSearchInput } from '../../Clinician';
import { VaccinationCourseDoseFragment } from '../api/operations.generated';
import { SelectBatchModal } from './SelectBatchModal';
import { AppRoute } from '@openmsupply-client/config';
import { ArrowRightIcon } from '@mui/x-date-pickers';

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
  const { localisedDate } = useFormatDateTime();
  const { success, error } = useNotification();
  const {
    draft,
    updateDraft,
    query: { dose, vaccination, isLoading },
    isDirty,
    isComplete,
    create,
  } = useVaccination({
    encounterId,
    vaccineCourseDoseId,
    vaccinationId,
    defaultClinician,
  });

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const height = useKeyboardHeightAdjustment(620);

  const {
    isOpen: batchModalOpen,
    onClose: closeBatchModal,
    onOpen: openBatchModal,
  } = useEditModal();

  const save = async () => {
    try {
      await create(draft);
      success(t('messages.vaccination-saved'))();
      onClose();
    } catch (e) {
      error(t('error.failed-to-save-vaccination'))();
      console.error(e);
    }
  };

  const alert: { severity: AlertColor; content: ReactNode } | undefined =
    vaccination?.given
      ? {
          severity: 'success',
          content: (
            <Box display="flex" alignItems="center">
              {t('messages.vaccination-was-given', {
                date: localisedDate(vaccination?.vaccinationDate ?? ''),
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
          ),
        }
      : undefined;

  const modalContent = isLoading ? (
    <BasicSpinner />
  ) : (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {alert && <Alert severity={alert.severity}>{alert.content}</Alert>}
      <VaccinationForm
        updateDraft={updateDraft}
        openBatchModal={openBatchModal}
        draft={draft}
        dose={dose}
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
      contentProps={{ sx: { paddingTop: alert ? 0 : undefined } }}
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
  updateDraft,
  openBatchModal,
}: {
  dose?: VaccinationCourseDoseFragment;
  draft: VaccinationDraft;
  updateDraft: (update: Partial<VaccinationDraft>) => void;
  openBatchModal: () => void;
}) => {
  const t = useTranslation('dispensary');

  const vaccineItemOptions = useMemo(() => {
    return (
      dose?.vaccineCourse.vaccineCourseItems?.map(item => ({
        label: item.name,
        value: item.itemId,
      })) ?? []
    );
  }, [dose?.id]);

  if (!dose) {
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
          <InputWithLabelRow
            label={t('label.batch')}
            Input={
              <Button
                disabled={!draft.itemId}
                onClick={() => draft.itemId && openBatchModal()}
                sx={{
                  ...baseButtonStyles,
                  // !draft.itemId === disabled
                  color: draft.itemId ? 'gray.main' : 'gray.light',
                  backgroundColor: draft.itemId && 'background.menu',
                  // stock line is selected
                  fontStyle: draft.stockLine ? 'none' : 'italic',
                }}
              >
                {draft.stockLine
                  ? (draft.stockLine.batch ?? t('label.selected'))
                  : t('label.select-batch')}
              </Button>
            }
          />
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

const baseButtonStyles: SxProps = {
  flex: 1,
  textTransform: 'none',
  justifyContent: 'left',
  border: '1px solid lightgray',
};
