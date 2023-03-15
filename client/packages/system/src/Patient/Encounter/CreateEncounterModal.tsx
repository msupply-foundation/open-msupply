import React, { FC, useState } from 'react';
import {
  AlertIcon,
  BasicSpinner,
  Box,
  DateTimePickerInput,
  DialogButton,
  EncounterNodeStatus,
  InputWithLabelRow,
  RouteBuilder,
  Stack,
  TimePickerInput,
  Typography,
  useDialog,
  useNavigate,
  useNotification,
} from '@openmsupply-client/common';
import { DateUtils, useTranslation } from '@common/intl';
import {
  EncounterRegistryByProgram,
  PatientModal,
  usePatientModalStore,
  useEncounter,
} from '@openmsupply-client/programs';
import { usePatient } from '../api';
import { AppRoute } from '@openmsupply-client/config';
import { EncounterSearchInput } from './EncounterSearchInput';
import {
  Clinician,
  ClinicianAutocompleteOption,
  ClinicianSearchInput,
  getClinicianName,
} from '../../Clinician';
interface Encounter {
  status?: EncounterNodeStatus;
  createdDatetime: string;
  startDatetime?: string;
  endDatetime?: string;
  clinician?: Clinician;
}

export const CreateEncounterModal: FC = () => {
  const patientId = usePatient.utils.id();
  const t = useTranslation('patients');
  const { current, setModal: selectModal } = usePatientModalStore();
  const [encounterRegistry, setEncounterRegistry] = useState<
    EncounterRegistryByProgram | undefined
  >();
  const [createdDatetime] = useState(new Date().toISOString());
  const [dataError, setDataError] = useState(false);
  const [formError, setFormError] = useState(false);
  const [draft, setDraft] = useState<Encounter | undefined>(undefined);
  const navigate = useNavigate();
  const { error } = useNotification();

  const handleSave = useEncounter.document.upsert(
    patientId,
    encounterRegistry?.program?.program ?? '',
    encounterRegistry?.encounter.documentType ?? ''
  );

  const reset = () => {
    selectModal(undefined);
    setEncounterRegistry(undefined);
    setDraft(undefined);
    setDataError(false);
  };

  const { Modal } = useDialog({
    isOpen: current === PatientModal.Encounter,
    onClose: reset,
  });

  const onChangeEncounter = (entry: EncounterRegistryByProgram) => {
    setDataError(false);
    setEncounterRegistry(entry);
  };

  const setStartDatetime = (date: Date | null): void => {
    const startDatetime = DateUtils.formatRFC3339(date);
    setFormError(false);
    setDraft({
      createdDatetime,
      ...draft,
      startDatetime,
      status:
        date && DateUtils.isFuture(date)
          ? EncounterNodeStatus.Scheduled
          : draft?.status,
    });
  };

  const setEndDatetime = (date: Date | null): void => {
    const endDatetime = DateUtils.formatRFC3339(date);
    setDraft({ createdDatetime, ...draft, endDatetime });
    setFormError(false);
  };

  const setClinician = (option: ClinicianAutocompleteOption | null): void => {
    if (option === null) {
      setDraft({ createdDatetime, ...draft, clinician: undefined });
      return;
    }
    const clinician = option.value;
    setDraft({ createdDatetime, ...draft, clinician });
  };

  const canSubmit = () =>
    !formError && draft !== undefined && draft.clinician && draft.startDatetime;

  console.log('formError', formError);

  return (
    <Modal
      title={t('label.new-encounter')}
      cancelButton={<DialogButton variant="cancel" onClick={reset} />}
      okButton={
        <DialogButton
          variant={'create'}
          disabled={!canSubmit()}
          onClick={async () => {
            if (encounterRegistry !== undefined) {
              const { id } = await handleSave(
                draft,
                encounterRegistry.encounter.formSchemaId
              );
              if (!!id)
                navigate(
                  RouteBuilder.create(AppRoute.Dispensary)
                    .addPart(AppRoute.Encounter)
                    .addPart(id)
                    .build()
                );
              else error(t('error.encounter-not-created'))();
            }
            reset();
          }}
        />
      }
      width={700}
    >
      <React.Suspense fallback={<div />}>
        <Stack alignItems="flex-start" gap={1} sx={{ paddingLeft: '20px' }}>
          <InputWithLabelRow
            label={t('label.encounter')}
            Input={
              <EncounterSearchInput onChange={onChangeEncounter} value={null} />
            }
          />
          <RenderForm
            isError={dataError}
            isLoading={false}
            isProgram={!!encounterRegistry}
            form={
              <>
                <InputWithLabelRow
                  label={t('label.visit-date')}
                  Input={
                    <DateTimePickerInput
                      value={draft?.startDatetime}
                      onChange={setStartDatetime}
                      onError={() => {
                        console.log('ERROROROR');
                        setFormError(true);
                      }}
                    />
                  }
                />
                <InputWithLabelRow
                  label={t('label.visit-end')}
                  Input={
                    <TimePickerInput
                      value={draft?.endDatetime}
                      disabled={draft?.startDatetime === undefined}
                      onChange={setEndDatetime}
                      onError={() => setFormError(true)}
                    />
                  }
                />
                <InputWithLabelRow
                  label={t('label.clinician')}
                  Input={
                    <ClinicianSearchInput
                      onChange={setClinician}
                      clinicianLabel={getClinicianName(draft?.clinician)}
                      clinicianValue={draft?.clinician}
                    />
                  }
                />
              </>
            }
          />
        </Stack>
      </React.Suspense>
    </Modal>
  );
};

const RenderForm = ({
  form,
  isError,
  isLoading,
  isProgram,
}: {
  form: React.ReactNode;
  isError: boolean;
  isLoading: boolean;
  isProgram: boolean;
}) => {
  const t = useTranslation('common');
  if (!isProgram) return null;
  if (isError)
    return (
      <Box display="flex" gap={1} padding={3}>
        <AlertIcon color="error" />
        <Typography color="error">{t('error.unable-to-load-data')}</Typography>
      </Box>
    );
  if (isLoading) return <BasicSpinner />;

  return <>{form}</>;
};
