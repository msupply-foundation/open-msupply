import React, { FC, memo, useState } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelLabel,
  PanelRow,
  useTranslation,
  Tooltip,
  BasicTextInput,
  useDebouncedValueCallback,
  useConfirmationModal,
  DateTimePickerInput,
  DateUtils,
  Formatter,
} from '@openmsupply-client/common';
import { usePrescription, usePrescriptionLines } from '../../api';
import {
  Clinician,
  ClinicianSearchInput,
  ProgramSearchInput,
} from '@openmsupply-client/system';
import { ProgramFragment, useProgramList } from '@openmsupply-client/programs';
// import {
//   Clinician,
//   ClinicianSearchInput,
// } from '../../../../../system/src/Clinician';

export const PrescriptionDetailsSectionComponent: FC = () => {
  const t = useTranslation();
  const {
    query: { data },
    isDisabled,
    update: { update },
    rows: items,
  } = usePrescription();
  const {
    id,
    clinician,
    prescriptionDate,
    createdDatetime,
    programId,
    theirReference,
  } = data ?? {};
  const deleteAll = () => {
    const allRows = (items ?? []).map(({ lines }) => lines.flat()).flat() ?? [];
    if (allRows.length === 0) return;
    deleteLines(allRows);
  };
  const { data: programData } = useProgramList(true);
  const programs = programData?.nodes ?? [];
  const selectedProgram = programs.find(prog => prog.id === programId);
  const {
    delete: { deleteLines },
  } = usePrescriptionLines();
  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-delete-prescription-lines'),
  });
  const [clinicianValue, setClinicianValue] = useState<Clinician | null>(
    clinician ?? null
  );
  const [dateValue, setDateValue] = useState(
    DateUtils.getDateOrNull(prescriptionDate) ??
      DateUtils.getDateOrNull(createdDatetime) ??
      null
  );

  const handleProgramChange = async (
    newProgram: ProgramFragment | undefined
  ) => {
    if (!newProgram || !items || items.length === 0) {
      // It's okay to *clear* program without losing current items
      await update({ id, programId: newProgram?.id ?? null });
      return;
    }

    getConfirmation({
      onConfirm: async () => {
        // For simplicity, we currently delete all items that have already been
        // added when switching programs. We may wish to improve this in the
        // future to only remove items that don't belong to the new program
        await deleteAll();
        await update({ id, programId: newProgram?.id });
      },
    });
  };

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

  const [theirReferenceInput, setTheirReferenceInput] =
    useState(theirReference);
  const debouncedUpdate = useDebouncedValueCallback(update, [
    theirReferenceInput,
  ]);

  if (!createdDatetime) return null;

  return (
    <DetailPanelSection title={t('heading.prescription-details')}>
      <Grid container gap={0.5} key="prescription-details">
        <PanelRow>
          <PanelLabel>{t('label.program')}</PanelLabel>
          <ProgramSearchInput
            disabled={isDisabled}
            programs={programs}
            selectedProgram={selectedProgram}
            onChange={handleProgramChange}
          />
        </PanelRow>

        <PanelRow>
          <PanelLabel>{t('label.clinician')}</PanelLabel>
          <ClinicianSearchInput
            disabled={isDisabled}
            onChange={async clinician => {
              setClinicianValue(clinician ? clinician.value : null);
              update({
                id,
                clinicianId: clinician?.value?.id ?? null,
              });
            }}
            clinicianValue={clinicianValue}
          />
        </PanelRow>

        <PanelRow>
          <PanelLabel>{t('label.reference')}</PanelLabel>
          <Tooltip title={theirReferenceInput} placement="bottom-start">
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
          </Tooltip>
        </PanelRow>

        <PanelRow>
          <PanelLabel>{t('label.dispensing-date')}</PanelLabel>
          <DateTimePickerInput
            disabled={isDisabled}
            value={DateUtils.getDateOrNull(dateValue) ?? new Date()}
            format="P"
            onChange={handleDateChange}
            maxDate={new Date()}
          />
        </PanelRow>
      </Grid>
    </DetailPanelSection>
  );
};

export const PrescriptionDetailsSection = memo(
  PrescriptionDetailsSectionComponent
);
