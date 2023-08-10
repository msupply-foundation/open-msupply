import React, { FC, useState } from 'react';
import {
  AlertIcon,
  BasicSpinner,
  Box,
  DialogButton,
  InputWithLabelRow,
  RouteBuilder,
  Stack,
  Typography,
  useDialog,
  useNavigate,
  useNotification,
  DatePickerInput,
  ContactTraceNodeStatus,
} from '@openmsupply-client/common';
import { DateUtils, useTranslation } from '@common/intl';
import {
  PatientModal,
  usePatientModalStore,
  DocumentRegistryFragment,
  useContactTraces,
} from '@openmsupply-client/programs';
import { AppRoute } from '@openmsupply-client/config';
import { ContactTraceSearchInput } from './ContactTraceSearchInput';
import { usePatient } from '../../api';

interface ContactTrace {
  status?: ContactTraceNodeStatus;
  datetime?: string;
}

export const CreateContactTraceModal: FC = () => {
  const patientId = usePatient.utils.id();
  const t = useTranslation('dispensary');
  const { current, setModal: selectModal } = usePatientModalStore();
  const [traceRegistry, setTraceRegistry] = useState<
    DocumentRegistryFragment | undefined
  >();
  const [dataError, setDataError] = useState(false);
  const [draft, setDraft] = useState<ContactTrace | undefined>(undefined);
  const navigate = useNavigate();
  const { error } = useNotification();
  const [datetimeError, setDatetimeError] = useState(false);

  const handleSave = useContactTraces.document.upsert(
    patientId,
    traceRegistry?.documentType ?? ''
  );

  const reset = () => {
    selectModal(undefined);
    setTraceRegistry(undefined);
    setDraft(undefined);
    setDataError(false);
  };

  const { Modal } = useDialog({
    isOpen: current === PatientModal.ContactTraceSearch,
    onClose: reset,
  });

  const onChangeContactTrace = (entry: DocumentRegistryFragment) => {
    setDataError(false);
    setTraceRegistry(entry);
  };

  const currentOrNewDraft = (): ContactTrace => {
    return (
      draft ?? {
        datetime: DateUtils.formatRFC3339(DateUtils.addCurrentTime(new Date())),
        status: ContactTraceNodeStatus.Pending,
      }
    );
  };
  const setDatetime = (date: Date | null): void => {
    const datetime = DateUtils.formatRFC3339(DateUtils.addCurrentTime(date));
    setDraft({
      ...currentOrNewDraft(),
      datetime,
    });
    setDatetimeError(false);
  };

  const canSubmit = () =>
    draft !== undefined && draft.datetime && !datetimeError;

  return (
    <Modal
      title={t('label.new-encounter')}
      cancelButton={<DialogButton variant="cancel" onClick={reset} />}
      okButton={
        <DialogButton
          variant={'save'}
          disabled={!canSubmit()}
          onClick={async () => {
            if (traceRegistry !== undefined) {
              const { id } = await handleSave(
                draft,
                traceRegistry.formSchemaId
              );
              if (!!id)
                navigate(
                  RouteBuilder.create(AppRoute.Dispensary)
                    .addPart(AppRoute.ContactTrace)
                    .addPart(id)
                    .build()
                );
              else error(t('error.contact-trace-not-created'))();
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
            label={t('label.contact-trace-type')}
            Input={
              <ContactTraceSearchInput
                onChange={onChangeContactTrace}
                value={null}
                width={250}
              />
            }
          />
          <RenderForm
            isError={dataError}
            isLoading={false}
            isProgram={!!traceRegistry}
            form={
              <>
                <InputWithLabelRow
                  label={t('label.visit-date')}
                  Input={
                    <DatePickerInput
                      value={DateUtils.getDateOrNull(draft?.datetime)}
                      onChange={setDatetime}
                      onError={() => setDatetimeError(true)}
                      width={250}
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
