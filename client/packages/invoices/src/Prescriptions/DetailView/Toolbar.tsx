import React, { useEffect, useState } from 'react';
import {
  AppBarContentPortal,
  InputWithLabelRow,
  Grid,
  useTranslation,
  DateTimePickerInput,
  Formatter,
  DateUtils,
  useConfirmationModal,
  DefaultAutocompleteItemOption,
  Box,
  Typography,
  useCallbackWithPermission,
  UserPermission,
} from '@openmsupply-client/common';
import {
  Clinician,
  ClinicianSearchInput,
  CreatePatientModal,
  EditPatientModal,
  PatientSearchInput,
} from '@openmsupply-client/system';
import { ProgramSearchInput } from '@openmsupply-client/system';
import { ProgramFragment, useProgramList } from '@openmsupply-client/programs';

import { usePrescriptionLines } from '../api/hooks/usePrescriptionLines';
import { usePrescription } from '../api';

export const Toolbar = () => {
  const t = useTranslation();

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
    clinician,
    programId,
  } = data ?? {};

  const [dateValue, setDateValue] = useState(
    DateUtils.getDateOrNull(prescriptionDate) ??
      DateUtils.getDateOrNull(createdDatetime) ??
      null
  );

  const [createPatientModalOpen, setCreatePatientModalOpen] = useState(false);
  const [editPatientModalOpen, setEditPatientModalOpen] = useState(false);
  const [clinicianValue, setClinicianValue] = useState<Clinician | null>(
    clinician ?? null
  );
  const [currentPatientId, setCurrentPatientId] = useState<string | undefined>(
    patient?.id
  );

  const { data: programData } = useProgramList();
  const programs = programData?.nodes ?? [];
  const selectedProgram = programs.find(prog => prog.id === programId);

  const {
    delete: { deleteLines },
  } = usePrescriptionLines();

  useEffect(() => {
    setCurrentPatientId(patient?.id);
  }, [patient?.id]);

  const deleteAll = async () => {
    const allRows = (items ?? []).map(({ lines }) => lines.flat()).flat() ?? [];
    if (allRows.length === 0) return;
    return deleteLines(allRows);
  };

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

  const openPatientModal = useCallbackWithPermission(
    UserPermission.PatientMutate,
    () => {
      setCreatePatientModalOpen(true);
    }
  );

  const selectPatient = async (selectPatientId: string) => {
    await update({ id, patientId: selectPatientId });
    setCurrentPatientId(selectPatientId);
    setCreatePatientModalOpen(false);
  };

  return (
    <AppBarContentPortal
      sx={{ display: 'flex', flex: 1, marginBottom: 1, gap: 4 }}
    >
      <Grid container flexDirection="column" display="flex" gap={1}>
        {patient && (
          <InputWithLabelRow
            label={t('label.patient')}
            Input={
              <PatientSearchInput
                disabled={isDisabled}
                value={patient}
                allowEdit
                onChange={async ({ id: patientId }) => {
                  await update({ id, patientId });
                }}
                setEditPatientModalOpen={setEditPatientModalOpen}
                NoOptionsRenderer={props => (
                  <DefaultAutocompleteItemOption
                    {...props}
                    key="no-options-renderer"
                  >
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="flex-end"
                      gap={1}
                      height={25}
                      width="100%"
                    >
                      <Typography
                        overflow="hidden"
                        fontWeight="bold"
                        textOverflow="ellipsis"
                        sx={{
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t('messages.no-matching-patients')}
                      </Typography>
                      <Typography
                        onClick={() => {
                          openPatientModal();
                        }}
                        color="secondary"
                      >
                        {t('button.create-new-patient')}
                      </Typography>
                    </Box>
                  </DefaultAutocompleteItemOption>
                )}
              />
            }
          />
        )}
        <InputWithLabelRow
          label={t('label.clinician')}
          Input={
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
              allowCreate
            />
          }
        />
      </Grid>
      <Grid container flexDirection="column" display="flex" gap={1}>
        <InputWithLabelRow
          label={t('label.date')}
          Input={
            <DateTimePickerInput
              disabled={isDisabled}
              value={DateUtils.getDateOrNull(dateValue) ?? new Date()}
              format="P"
              onChange={handleDateChange}
              maxDate={new Date()}
              actions={['cancel', 'accept']}
            />
          }
        />
        <InputWithLabelRow
          label={t('label.program')}
          Input={
            <ProgramSearchInput
              disabled={isDisabled}
              programs={programs}
              selectedProgram={selectedProgram}
              onChange={handleProgramChange}
            />
          }
          sx={{
            '& .MuiAutocomplete-root': {
              width: 0,
              minWidth: 220,
            },
          }}
        />
      </Grid>
      {createPatientModalOpen && (
        <CreatePatientModal
          onClose={() => setCreatePatientModalOpen(false)}
          onCreatePatient={newPatient => {
            setEditPatientModalOpen(true);
            setCurrentPatientId(newPatient.id);
          }}
          onSelectPatient={selectedPatient => {
            selectPatient(selectedPatient);
          }}
        />
      )}

      {currentPatientId && editPatientModalOpen && (
        <EditPatientModal
          patientId={currentPatientId}
          onClose={() => {
            setEditPatientModalOpen(false);
            setCurrentPatientId(patient?.id);
          }}
          isOpen={editPatientModalOpen}
        />
      )}
    </AppBarContentPortal>
  );
};
