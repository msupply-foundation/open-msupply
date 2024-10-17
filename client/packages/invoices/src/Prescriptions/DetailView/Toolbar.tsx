import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  Grid,
  useTranslation,
  DropdownMenu,
  DropdownMenuItem,
  DeleteIcon,
  DateTimePickerInput,
  Formatter,
  DateUtils,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { PatientSearchInput } from '@openmsupply-client/system';
import { usePrescription } from '../api';
import { ClinicianSearchInput } from '../../../../system/src/Clinician';
import { usePrescriptionRows } from '../api/hooks/line/usePrescriptionRows';

export const Toolbar: FC = () => {
  const { id, patient, clinician, prescriptionDate, update } =
    usePrescription.document.fields([
      'id',
      'patient',
      'clinician',
      'prescriptionDate',
    ]);
  const onDelete = usePrescription.line.deleteSelected();
  const onDeleteAll = usePrescription.line.deleteAll();
  const { items } = usePrescriptionRows();

  const isDisabled = usePrescription.utils.isDisabled();
  const t = useTranslation('dispensary');

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-delete-all-lines'),
  });

  const handleDateChange = async (prescriptionDate: Date | null) => {
    if (!items || items.length === 0) {
      // If there are no lines, we can just update the prescription date
      await update({
        id,
        prescriptionDate: Formatter.toIsoString(
          DateUtils.endOfDayOrNull(prescriptionDate)
        ),
      });
      return;
    }

    // Otherwise, we need to delete all the lines first
    getConfirmation({
      onConfirm: async () => {
        await onDeleteAll();
        await update({
          id,
          prescriptionDate: Formatter.toIsoString(
            DateUtils.endOfDayOrNull(prescriptionDate)
          ),
        });
      },
    });
  };

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid
        container
        flexDirection="row"
        display="flex"
        flex={1}
        alignItems="flex-end"
      >
        <Grid item display="flex" flex={1}>
          <Box
            display="flex"
            flex={1}
            flexDirection="column"
            gap={1}
            maxWidth={'fit-content'}
          >
            {patient && (
              <InputWithLabelRow
                label={t('label.patient')}
                Input={
                  <PatientSearchInput
                    disabled={isDisabled}
                    value={patient}
                    onChange={async ({ id: otherPartyId }) => {
                      await update({ id, otherPartyId });
                    }}
                  />
                }
              />
            )}
            <InputWithLabelRow
              label={t('label.clinician')}
              Input={
                <ClinicianSearchInput
                  onChange={async clinician => {
                    await update({
                      id,
                      clinicianId: clinician?.value?.id ?? undefined,
                    });
                  }}
                  clinicianValue={clinician}
                />
              }
            />
          </Box>
          <Box display="flex" flexDirection="column" flex={1} marginLeft={3}>
            <InputWithLabelRow
              label={t('label.date')}
              Input={
                <DateTimePickerInput
                  disabled={isDisabled}
                  defaultValue={new Date()}
                  value={DateUtils.getDateOrNull(prescriptionDate)}
                  format="P"
                  onChange={handleDateChange}
                  maxDate={new Date()}
                />
              }
            />
          </Box>
        </Grid>
        <Grid
          item
          display="flex"
          gap={1}
          justifyContent="flex-end"
          alignItems="center"
        >
          <DropdownMenu label={t('label.actions')}>
            <DropdownMenuItem
              IconComponent={DeleteIcon}
              onClick={onDelete}
              disabled={isDisabled}
            >
              {t('button.delete-lines')}
            </DropdownMenuItem>
          </DropdownMenu>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
