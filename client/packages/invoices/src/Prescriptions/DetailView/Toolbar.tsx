import React, { FC, useState } from 'react';
import {
  AppBarContentPortal,
  InputWithLabelRow,
  Grid,
  useTranslation,
  DateTimePickerInput,
  Formatter,
  DateUtils,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { PatientSearchInput } from '@openmsupply-client/system';
import { usePrescriptionLines } from '../api/hooks/usePrescriptionLines';
import { usePrescription } from '../api';

export const Toolbar: FC = () => {
  const {
    query: { data },
    update: { update },
    isDisabled,
    rows: items,
  } = usePrescription();
  const {
    id,
    patient,
    prescriptionDate,
    createdDatetime,
    // theirReference,
  } = data ?? {};

  const [dateValue, setDateValue] = useState(
    DateUtils.getDateOrNull(prescriptionDate) ??
      DateUtils.getDateOrNull(createdDatetime) ??
      null
  );

  const {
    delete: { deleteLines },
  } = usePrescriptionLines();

  const deleteAll = () => {
    const allRows = (items ?? []).map(({ lines }) => lines.flat()).flat() ?? [];
    if (allRows.length === 0) return;
    deleteLines(allRows);
  };

  const t = useTranslation();

  // const [theirReferenceInput, setTheirReferenceInput] =
  //   useState(theirReference);

  // const debouncedUpdate = useDebouncedValueCallback(update, [
  //   theirReferenceInput,
  // ]);

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-delete-prescription-lines'),
  });

  const handleDateChange = async (newPrescriptionDate: Date | null) => {
    const currentDateValue = dateValue; // Revert to this value if user cancels

    if (!newPrescriptionDate) return;
    setDateValue(newPrescriptionDate);

    const oldPrescriptionDate = DateUtils.getDateOrNull(dateValue);

    if (
      newPrescriptionDate.toLocaleDateString() ===
      oldPrescriptionDate?.toLocaleDateString()
    )
      return;

    if (!items || items.length === 0) {
      // If there are no lines, we can just update the prescription date
      await update({
        id,
        prescriptionDate: Formatter.toIsoString(
          DateUtils.endOfDayOrNull(newPrescriptionDate)
        ),
      });
      return;
    }

    // Otherwise, we need to delete all the lines first
    getConfirmation({
      onConfirm: async () => {
        await deleteAll();
        await update({
          id,
          prescriptionDate: Formatter.toIsoString(
            DateUtils.endOfDayOrNull(newPrescriptionDate)
          ),
        });
      },
      onCancel: () => setDateValue(currentDateValue),
    });
  };

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid container flexDirection="column" display="flex" gap={1}>
        {patient && (
          <InputWithLabelRow
            label={t('label.patient')}
            Input={
              <PatientSearchInput
                disabled={isDisabled}
                value={patient}
                onChange={async ({ id: patientId }) => {
                  await update({ id, patientId });
                }}
              />
            }
          />
        )}
        <InputWithLabelRow
          label={t('label.date')}
          Input={
            <DateTimePickerInput
              disabled={isDisabled}
              value={DateUtils.getDateOrNull(dateValue) ?? new Date()}
              format="P"
              onChange={handleDateChange}
              maxDate={new Date()}
            />
          }
        />
        {/* <InputWithLabelRow
          label={t('label.reference')}
          Input={
            <BasicTextInput
              disabled={isDisabled}
              size="small"
              sx={{ width: 250 }}
              value={theirReferenceInput ?? ''}
              onChange={event => {
                setTheirReferenceInput(event.target.value);
                debouncedUpdate({ theirReference: event.target.value });
              }}
            />
          }
        /> */}
      </Grid>
    </AppBarContentPortal>
  );
};
