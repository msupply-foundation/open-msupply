import React, { FC, useEffect, useState } from 'react';
import {
  useTranslation,
  // useBreadcrumbs,
  // DetailContainer,
  // DetailInputWithLabelRow,
  // DetailSection,
  // Checkbox,
  // Grid,
  // useFormatDateTime,
  Typography,
  Box,
  BasicSpinner,
  // MuiLink,
  AlertIcon,
  DialogButton,
  InputWithLabelRow,
  Stack,
  useDialog,
} from '@openmsupply-client/common';
import { useEncounter } from '../api';
import { ProgramRowFragmentWithId } from '../../Patient';
import { ProgramSearchInput } from '../../Patient/Components';
import { usePatientModalStore } from '../../Patient/hooks';
import { CreateDocument, useJsonForms } from '../../Patient/JsonForms';
import { PatientModal } from '../../Patient/PatientView';

export const DetailView: FC = () => {
  const t = useTranslation('patients');
  const { current, reset, document } = usePatientModalStore();
  const [program, setProgram] = useState<ProgramRowFragmentWithId | null>(null);
  const [error, setError] = useState(false);
  const { mutate: fetch, isLoading, data } = useEncounter.registry.byProgram();
  const isCreate = !document?.name;
  const [createDoc, setCreateDoc] = useState<CreateDocument | undefined>(
    undefined
  );

  const patientId = 'nothing-here';
  const handleSave = useEncounter.document.upsert(
    patientId,
    program?.type ?? '',
    createDoc?.documentRegistry?.documentType ?? ''
  );
  const { JsonForm, saveData, isDirty, validationError } = useJsonForms(
    document?.name,
    {
      handleSave,
    },
    createDoc
  );

  const onClose = () => {
    reset();
    setProgram(null);
    setCreateDoc(undefined);
    setError(false);
  };

  const { Modal } = useDialog({
    isOpen: current === PatientModal.Encounter,
    onClose,
  });

  const onChangeProgram = (program: ProgramRowFragmentWithId) => {
    setProgram(program);
    setError(false);
    fetch(program.document.documentRegistry?.id || '');
  };

  useEffect(() => {
    if (data && data?.totalCount > 0) {
      const documentRegistry = data.nodes[0];
      if (documentRegistry) {
        setCreateDoc({ data: {}, documentRegistry });
        setError(false);
        return;
      }
    } else {
      setError(true);
    }
    setCreateDoc(undefined);
  }, [data]);

  return (
    <Modal
      title={t(isCreate ? 'label.new-encounter' : 'label.edit-encounter')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          variant={isCreate ? 'create' : 'ok'}
          disabled={!isDirty || !!validationError}
          onClick={async () => {
            await saveData();
            reset();
          }}
        />
      }
      width={700}
    >
      <React.Suspense fallback={<div />}>
        <Stack alignItems="center">
          {isCreate && (
            <InputWithLabelRow
              label={t('label.program')}
              Input={
                <ProgramSearchInput
                  onChange={onChangeProgram}
                  value={program}
                />
              }
            />
          )}
          <RenderForm
            Form={JsonForm}
            isCreate={isCreate}
            isError={error}
            isLoading={isLoading}
            isProgram={!!program}
          />
        </Stack>
      </React.Suspense>
    </Modal>
  );
};

const RenderForm = ({
  Form,
  isCreate,
  isError,
  isLoading,
  isProgram,
}: {
  Form: React.ReactNode;
  isCreate: boolean;
  isError: boolean;
  isLoading: boolean;
  isProgram: boolean;
}) => {
  const t = useTranslation('common');
  if (!isProgram && isCreate) return null;
  if (isError)
    return (
      <Box display="flex" gap={1} padding={3}>
        <AlertIcon color="error" />
        <Typography color="error">{t('error.unable-to-load-data')}</Typography>
      </Box>
    );
  if (isLoading) return <BasicSpinner />;

  return <>{Form}</>;
};
