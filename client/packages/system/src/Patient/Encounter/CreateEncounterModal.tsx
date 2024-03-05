import React, { FC, useCallback, useEffect, useState } from 'react';
import {
  AlertIcon,
  BasicSpinner,
  Box,
  DialogButton,
  EncounterNodeStatus,
  InputWithLabelRow,
  RouteBuilder,
  Stack,
  Typography,
  useDialog,
  useNavigate,
  useNotification,
  useAuthContext,
  TextArea,
  DateTimePickerInput,
  Tooltip,
} from '@openmsupply-client/common';
import { DateUtils, useIntlUtils, useTranslation } from '@common/intl';
import {
  EncounterRegistryByProgram,
  PatientModal,
  usePatientModalStore,
  useEncounter,
  NoteSchema,
  EncounterSchema,
} from '@openmsupply-client/programs';
import { usePatient } from '../api';
import { AppRoute } from '@openmsupply-client/config';
import { EncounterSearchInput } from './EncounterSearchInput';
import {
  ClinicianAutocompleteOption,
  ClinicianSearchInput,
} from '../../Clinician';
import { PatientTabValue } from '../PatientView/PatientView';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers';
import Badge from '@mui/material/Badge';

type HighlightedDay = { datetime: Date; label?: string | null };
type BadgePickersDayProps = {
  highlightedDays: HighlightedDay[];
};
const BadgePickersDay = (
  props: PickersDayProps<Date> & BadgePickersDayProps
) => {
  const { highlightedDays = [], day, outsideCurrentMonth, ...other } = props;

  const matchingDay = highlightedDays.find(it =>
    DateUtils.isSameDay(it.datetime, day)
  );
  const isSelected = !props.outsideCurrentMonth && !!matchingDay;
  return (
    <Badge
      key={props.day.toString()}
      overlap="circular"
      badgeContent={
        isSelected ? (
          <Tooltip title={matchingDay?.label ?? ''}>
            <span>⚠️</span>
          </Tooltip>
        ) : undefined
      }
    >
      <PickersDay
        {...other}
        outsideCurrentMonth={outsideCurrentMonth}
        day={day}
      />
    </Badge>
  );
};

export const CreateEncounterModal: FC = () => {
  const patientId = usePatient.utils.id();
  const { user, storeId } = useAuthContext();
  const t = useTranslation('dispensary');
  const { getLocalisedFullName } = useIntlUtils();
  const { current, setModal: selectModal } = usePatientModalStore();
  const [encounterRegistry, setEncounterRegistry] = useState<
    EncounterRegistryByProgram | undefined
  >();
  const [createdDatetime] = useState(new Date().toISOString());
  const [dataError, setDataError] = useState(false);
  const [draft, setDraft] = useState<EncounterSchema | undefined>(undefined);
  const navigate = useNavigate();
  const { error } = useNotification();
  const [startDateTimeError, setStartDateTimeError] = useState<string>();

  const handleSave = useEncounter.document.upsert(
    patientId,
    encounterRegistry?.encounter.documentType ?? ''
  );

  const { data: latestEncounterData } =
    usePatient.document.latestPatientEncounter(
      patientId,
      encounterRegistry?.encounter.documentType
    );
  const latestEncounter = latestEncounterData?.nodes[0];
  const suggestedNextEncounter = latestEncounter?.suggestedNextEncounter;
  const suggestedNextInFuture = suggestedNextEncounter
    ? new Date(suggestedNextEncounter.startDatetime).getTime() > Date.now()
    : false;
  const reset = () => {
    selectModal(undefined);
    setEncounterRegistry(undefined);
    setDraft(undefined);
    setDataError(false);
    setNote(undefined);
  };

  const { Modal } = useDialog({
    isOpen: current === PatientModal.Encounter,
    onClose: reset,
  });

  const onChangeEncounter = (entry: EncounterRegistryByProgram) => {
    setDataError(false);
    setEncounterRegistry(entry);
    setDraft(undefined);
  };

  const currentOrNewDraft = useCallback((): EncounterSchema => {
    return (
      draft ?? {
        createdDatetime,
        createdBy: { id: user?.id ?? '', username: user?.name ?? '' },
        status: EncounterNodeStatus.Pending,
        location: {
          storeId,
        },
      }
    );
  }, [createdDatetime, draft, storeId, user?.id, user?.name]);
  // set the startDatetime from the suggestedNextEncounter
  useEffect(() => {
    // don't suggest date if there is already an encounter for this day
    if (
      latestEncounter?.suggestedNextEncounter?.startDatetime &&
      latestEncounter?.startDatetime &&
      DateUtils.isSameDay(
        new Date(latestEncounter.suggestedNextEncounter.startDatetime),
        new Date(latestEncounter.startDatetime)
      )
    ) {
      return;
    }
    if (
      !latestEncounter?.suggestedNextEncounter ||
      encounterRegistry?.encounter.documentType !== latestEncounter.type
    ) {
      return;
    }
    // don't suggest date if already selected
    if (!!draft?.startDatetime) {
      return;
    }

    if (!suggestedNextInFuture) return;
    setDraft({
      ...currentOrNewDraft(),
      startDatetime: latestEncounter.suggestedNextEncounter?.startDatetime,
    });
  }, [
    draft,
    currentOrNewDraft,
    encounterRegistry?.encounter.documentType,
    latestEncounter,
    suggestedNextInFuture,
  ]);

  const setStartDatetime = (date: Date | null): void => {
    const startDatetime = DateUtils.formatRFC3339(
      DateUtils.addCurrentTime(date)
    );
    setDraft({
      ...currentOrNewDraft(),
      startDatetime,
    });
    setStartDateTimeError(undefined);
  };

  const setClinician = (option: ClinicianAutocompleteOption | null): void => {
    if (option === null) {
      setDraft({ ...currentOrNewDraft(), clinician: undefined });
      return;
    }
    const clinician = option.value;
    setDraft({ ...currentOrNewDraft(), clinician });
  };

  const setNote = (notes: NoteSchema[] | undefined): void => {
    setDraft({ ...currentOrNewDraft(), notes });
  };

  const canSubmit = () =>
    draft !== undefined && draft.startDatetime && !startDateTimeError;

  const getHighlightedDays = (): HighlightedDay[] => {
    if (!suggestedNextInFuture || !suggestedNextEncounter) return [];
    return [
      {
        datetime: new Date(suggestedNextEncounter.startDatetime),
        label: suggestedNextEncounter.label,
      },
    ];
  };

  return (
    <Modal
      title={t('label.new-encounter')}
      cancelButton={<DialogButton variant="cancel" onClick={reset} />}
      okButton={
        <DialogButton
          variant={'save'}
          disabled={!canSubmit()}
          onClick={async () => {
            if (encounterRegistry !== undefined) {
              const { id } = await handleSave(
                draft,
                encounterRegistry.encounter.formSchemaId
              );

              if (!id) {
                error(t('error.encounter-not-created'))();
                return;
              }
              const startDatetime = new Date(draft?.startDatetime ?? 0);
              if (DateUtils.addHours(startDatetime, 1).getTime() > Date.now()) {
                navigate(
                  RouteBuilder.create(AppRoute.Dispensary)
                    .addPart(AppRoute.Patients)
                    .addPart(patientId)
                    .addQuery({ tab: PatientTabValue.Encounters })
                    .build()
                );
              } else {
                navigate(
                  RouteBuilder.create(AppRoute.Dispensary)
                    .addPart(AppRoute.Encounter)
                    .addPart(id)
                    .build()
                );
              }
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
              <EncounterSearchInput
                onChange={onChangeEncounter}
                lastEncounterType={latestEncounter?.type}
                width={250}
              />
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
                      value={DateUtils.getDateOrNull(draft?.startDatetime)}
                      onChange={setStartDatetime}
                      onError={validationError =>
                        setStartDateTimeError(validationError as string)
                      }
                      error={startDateTimeError}
                      width={250}
                      slots={{
                        day: BadgePickersDay as React.FC<PickersDayProps<Date>>,
                      }}
                      slotProps={{
                        day: {
                          highlightedDays: getHighlightedDays(),
                        } as any,
                      }}
                    />
                  }
                />
                <InputWithLabelRow
                  label={t('label.clinician')}
                  Input={
                    <ClinicianSearchInput
                      onChange={setClinician}
                      clinicianLabel={getLocalisedFullName(
                        draft?.clinician?.firstName,
                        draft?.clinician?.lastName
                      )}
                      clinicianValue={draft?.clinician}
                      width={250}
                    />
                  }
                />
                <InputWithLabelRow
                  label={t('label.visit-notes')}
                  Input={
                    <TextArea
                      InputProps={{
                        sx: {
                          backgroundColor: 'background.drawer',
                        },
                      }}
                      value={draft?.notes?.[0]?.text ?? ''}
                      onChange={e => {
                        setNote([
                          {
                            authorId: user?.id,
                            authorName: user?.name,
                            created: new Date().toISOString(),
                            text: e.target.value,
                          },
                        ]);
                      }}
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
