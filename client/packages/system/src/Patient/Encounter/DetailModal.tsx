import React, { FC, useEffect, useState } from 'react';
import {
  AlertIcon,
  BasicSpinner,
  Box,
  DatePickerInput,
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
import { useEncounter } from '../../Encounter';
import { usePatientModalStore } from '../hooks';
import { PatientModal } from '../PatientView';
import { ProgramRowFragmentWithId, usePatient } from '../api';
import { ProgramEnrolmentSearchInput } from '../Components';
import {
  EncounterFragment,
  EncounterDocumentRegistryFragment,
} from '../../Encounter/api/operations.generated';
import { AppRoute } from 'packages/config/src';

type Encounter = Pick<
  EncounterFragment,
  'startDatetime' | 'endDatetime' | 'status'
>;

export const EncounterDetailModal: FC = () => {
  const patientId = usePatient.utils.id();
  const t = useTranslation('patients');
  const { current, selectModal } = usePatientModalStore();
  const [program, setProgram] = useState<ProgramRowFragmentWithId | null>(null);
  const [isError, setIsError] = useState(false);
  const {
    mutate: fetch,
    isLoading,
    data: registryData,
  } = useEncounter.registry.byProgram();
  const [documentRegistry, setDocumentRegistry] = useState<
    EncounterDocumentRegistryFragment | undefined
  >(undefined);

  const [data, setData] = useState<Encounter | undefined>(undefined);
  const navigate = useNavigate();
  const { error } = useNotification();

  const handleSave = useEncounter.document.upsert(
    patientId,
    program?.type ?? '',
    documentRegistry?.documentType ?? ''
  );

  const reset = () => {
    selectModal(undefined);
    setProgram(null);
    setDocumentRegistry(undefined);
    setData(undefined);
    setIsError(false);
  };

  const { Modal } = useDialog({
    isOpen: current === PatientModal.Encounter,
    onClose: reset,
  });

  const onChangeProgram = (program: ProgramRowFragmentWithId) => {
    setProgram(program);
    setIsError(false);
    fetch(program.document.documentRegistry?.id || '');
  };

  useEffect(() => {
    if (registryData && registryData?.totalCount > 0) {
      const documentRegistry = registryData.nodes[0];
      if (documentRegistry) {
        setDocumentRegistry(documentRegistry);
        setIsError(false);
        return;
      }
    } else {
      setIsError(true);
    }
    setDocumentRegistry(undefined);
  }, [registryData]);

  const setStartDatetime = (date: Date | null): void => {
    if (!date) return;

    const startDatetime = DateUtils.formatRFC3339(date);

    setData({
      ...data,
      startDatetime,
      status: DateUtils.isFuture(date)
        ? EncounterNodeStatus.Scheduled
        : data?.status,
    });
  };

  const setEndDatetime = (date: Date | null): void => {
    const endDatetime = date ? DateUtils.formatRFC3339(date) : null;
    if (endDatetime && data?.startDatetime) setData({ ...data, endDatetime });
  };

  return (
    <Modal
      title={t('label.new-encounter')}
      cancelButton={<DialogButton variant="cancel" onClick={reset} />}
      okButton={
        <DialogButton
          variant={'create'}
          disabled={data === undefined || isLoading}
          onClick={async () => {
            if (documentRegistry !== undefined) {
              const { id } = await handleSave(
                data,
                documentRegistry.formSchemaId
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
            label={t('label.program')}
            Input={
              <ProgramEnrolmentSearchInput
                onChange={onChangeProgram}
                value={program}
              />
            }
          />
          <RenderForm
            isError={isError}
            isLoading={isLoading}
            isProgram={!!program}
            form={
              <>
                <InputWithLabelRow
                  label={t('label.visit-date')}
                  Input={
                    <DatePickerInput
                      value={DateUtils.getDateOrNull(
                        data?.startDatetime ?? null
                      )}
                      onChange={setStartDatetime}
                    />
                  }
                />
                <InputWithLabelRow
                  label={t('label.visit-start')}
                  Input={
                    <TimePickerInput
                      value={DateUtils.getDateOrNull(
                        data?.startDatetime ?? null
                      )}
                      onChange={setStartDatetime}
                    />
                  }
                />
                <InputWithLabelRow
                  label={t('label.visit-end')}
                  Input={
                    <TimePickerInput
                      value={DateUtils.getDateOrNull(data?.endDatetime ?? null)}
                      disabled={data?.startDatetime === undefined}
                      onChange={setEndDatetime}
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
