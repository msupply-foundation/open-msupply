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
} from '@openmsupply-client/common';
import { DateUtils, useTranslation } from '@common/intl';
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
import { PatientTabValue } from '../PatientView/PatientView';
import { CreateEncounterForm } from './CreateEncounterForm';

const LABEL_FLEX = '0 0 100px';

type HighlightedDay = { datetime: Date; label?: string | null };

export const CreateEncounterModal: FC = () => {
  const patientId = usePatient.utils.id();
  const { user, storeId } = useAuthContext();
  const t = useTranslation();
  const { current, setModal: selectModal } = usePatientModalStore();
  const [encounterRegistry, setEncounterRegistry] = useState<
    EncounterRegistryByProgram | undefined
  >();
  const [createdDatetime] = useState(new Date().toISOString());
  const [dataError, setDataError] = useState(false);
  const [draft, setDraft] = useState<EncounterSchema | undefined>(undefined);
  const navigate = useNavigate();
  const { error } = useNotification();
  const [hasFormError, setHasFormError] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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

  const setNote = (notes: NoteSchema[] | undefined): void => {
    setDraft({ ...currentOrNewDraft(), notes });
  };

  const canSubmit = () =>
    draft !== undefined && draft.startDatetime && !hasFormError;

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
          disabled={!canSubmit() || isCreating}
          onClick={async () => {
            if (encounterRegistry !== undefined) {
              setIsCreating(true);
              const { id } = await handleSave(
                draft,
                encounterRegistry.encounter.formSchemaId
              );

              if (!id) {
                setIsCreating(false);
                error(t('error.encounter-not-created'))();
                return;
              }
              const startDatetime = new Date(draft?.startDatetime ?? 0);
              const dateNow = Date.now();
              if (
                startDatetime.getTime() <=
                DateUtils.addMinutes(dateNow, 5).getTime()
              ) {
                navigate(
                  RouteBuilder.create(AppRoute.Dispensary)
                    .addPart(AppRoute.Encounter)
                    .addPart(id)
                    .build()
                );
              } else {
                navigate(
                  RouteBuilder.create(AppRoute.Dispensary)
                    .addPart(AppRoute.Patients)
                    .addPart(patientId)
                    .addQuery({ tab: PatientTabValue.Encounters })
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
        <Stack gap={1} sx={{ padding: '20px' }}>
          <InputWithLabelRow
            labelProps={{ sx: { flex: LABEL_FLEX } }}
            label={t('label.encounter')}
            Input={
              <EncounterSearchInput
                fullWidth
                onChange={onChangeEncounter}
                lastEncounterType={latestEncounter?.type}
              />
            }
          />
          <RenderForm
            isError={dataError}
            isLoading={false}
            isProgram={!!encounterRegistry}
            form={
              <CreateEncounterForm
                draft={currentOrNewDraft()}
                setDraft={setDraft}
                setHasFormError={setHasFormError}
                highlightedDays={getHighlightedDays()}
              />
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
  const t = useTranslation();
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
