import React, { FC, useState } from 'react';
import {
  BasicTextInput,
  Box,
  DateTimePickerInput,
  DateUtils,
  DefaultAutocompleteItemOption,
  DialogButton,
  FnUtils,
  Formatter,
  InputWithLabelRow,
  LoadingButton,
  SaveIcon,
  Stack,
  Typography,
  useDialog,
  useNavigate,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import {
  Clinician,
  ClinicianSearchInput,
  PatientSearchInput,
  ProgramSearchInput,
  SearchInputPatient,
} from '@openmsupply-client/system';
import { ProgramFragment, useProgramList } from '@openmsupply-client/programs';
import { usePrescription } from '../api';

interface NewPrescriptionModalProps {
  open: boolean;
  onClose: () => void;
  openPatientModal: () => void;
}

export const NewPrescriptionModal: FC<NewPrescriptionModalProps> = ({
  open,
  onClose,
  openPatientModal,
}) => {
  const t = useTranslation();
  const { data: programData } = useProgramList();
  const {
    create: { create, isCreating },
  } = usePrescription();
  const navigate = useNavigate();
  const { error } = useNotification();

  const { Modal } = useDialog({ isOpen: open, onClose, disableBackdrop: true });

  // Draft state:
  const [patient, setPatient] = useState<SearchInputPatient | null>(null);
  const [theirReference, setTheirReference] = useState<string>();
  const [program, setProgram] = useState<ProgramFragment>();
  const [clinician, setClinician] = useState<Clinician>();
  const [date, setDate] = useState<Date>(new Date());

  const programs = programData?.nodes ?? [];

  const handleClose = () => {
    // Reset all state so it doesn't persist for next opening
    setPatient(null);
    setTheirReference(undefined);
    setProgram(undefined);
    setClinician(undefined);
    onClose();
  };

  const handleSave = async () => {
    try {
      if (!patient) return;
      const prescriptionNumber = await create({
        id: FnUtils.generateUUID(),
        patientId: patient.id,
        theirReference,
        clinicianId: clinician?.id,
        programId: program?.id,
        prescriptionDate: Formatter.toIsoString(DateUtils.endOfDayOrNull(date)),
      });
      handleClose();
      navigate(String(prescriptionNumber));
    } catch (e) {
      const errorSnack = error(
        t('error.failed-to-create-prescription') + (e as Error).message
      );
      errorSnack();
    }
  };

  const canSave = patient && date;

  return (
    <Modal
      title={t('button.new-prescription')}
      okButton={
        <LoadingButton
          color="secondary"
          variant="contained"
          startIcon={<SaveIcon />}
          label={t('label.create')}
          isLoading={isCreating}
          onClick={handleSave}
          disabled={!canSave}
        />
      }
      cancelButton={<DialogButton variant="cancel" onClick={handleClose} />}
    >
      <Stack gap={2} flexDirection="column">
        <Box
          display="flex"
          flexDirection="row"
          gap={2}
          justifyContent="space-between"
          flexWrap="wrap"
        >
          <InputWithLabelRow
            label={t('label.patient')}
            Input={
              <PatientSearchInput
                autoFocus
                value={patient}
                onChange={result => {
                  setPatient(result);
                }}
                width={350}
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
                          handleClose();
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
        </Box>
        <Stack gap={2} flexDirection="row" width="100%" flexWrap="wrap">
          <Box display="flex" flexDirection="column" gap={2}>
            <InputWithLabelRow
              label={t('label.date')}
              Input={
                <DateTimePickerInput
                  value={DateUtils.getDateOrNull(date)}
                  format="P"
                  onChange={newDate => {
                    if (newDate) setDate(newDate);
                  }}
                />
              }
            />
            <InputWithLabelRow
              label={t('label.reference')}
              Input={
                <BasicTextInput
                  size="small"
                  sx={{ width: 250 }}
                  value={theirReference ?? null}
                  onChange={event => setTheirReference(event.target.value)}
                />
              }
            />
          </Box>
          <Box display="flex" flexDirection="column" gap={2}>
            <InputWithLabelRow
              label={t('label.clinician')}
              Input={
                <ClinicianSearchInput
                  onChange={clinician => setClinician(clinician?.value)}
                  clinicianValue={clinician}
                />
              }
            />
            {programs.length > 0 && (
              <InputWithLabelRow
                label={t('label.program')}
                Input={
                  <ProgramSearchInput
                    programs={programs}
                    selectedProgram={program}
                    onChange={newProgram => setProgram(newProgram)}
                  />
                }
              />
            )}
          </Box>
        </Stack>
      </Stack>
    </Modal>
  );
};
