import React, { FC, useState } from 'react';
import {
  BasicSpinner,
  DialogButton,
  useDialog,
} from '@openmsupply-client/common';
import { useEncounter } from './api/hooks';
import { usePatientModalStore } from '../hooks';
import { PatientModal } from '../PatientView';
import { ProgramRowFragmentWithId, usePatient } from '../api';
import { SaveDocumentMutation, useJsonForms } from '../JsonForms';
import { ProgramSearchInput } from '../Components';

const useUpsertEncounter = (
  patientId: string,
  programType: string,
  type: string
): SaveDocumentMutation => {
  const { mutateAsync: insertEncounter } = useEncounter.document.insert();
  const { mutateAsync: updateEncounter } = useEncounter.document.update();
  return async (jsonData: unknown, formSchemaId: string, parent?: string) => {
    if (parent === undefined) {
      const result = await insertEncounter({
        data: jsonData,
        schemaId: formSchemaId,
        patientId,
        type,
        programType,
      });
      return result;
    } else {
      const result = await updateEncounter({
        data: jsonData,
        parent,
        schemaId: formSchemaId,
      });
      return result;
    }
  };
};

export const EncounterDetailModal: FC = () => {
  const patientId = usePatient.utils.id();

  const { current, document, programType, reset, setProgramType } =
    usePatientModalStore();

  const [program, setProgram] = useState<ProgramRowFragmentWithId | null>(null);
  const handleSave = useUpsertEncounter(
    patientId,
    programType ?? '',
    document?.type ?? ''
  );
  const { JsonForm, saveData, isLoading, isDirty, validationError } =
    useJsonForms(
      document?.name,
      {
        handleSave,
      },
      document?.createDocument
    );

  const { Modal } = useDialog({
    isOpen: current === PatientModal.Encounter,
    onClose: reset,
  });

  const onChangeProgram = (program: ProgramRowFragmentWithId) => {
    setProgram(program);
    setProgramType(program.type);
    // setDocument(mapRegistry(program.document?.documentRegistry || undefined));
  };

  return (
    <Modal
      title=""
      cancelButton={<DialogButton variant="cancel" onClick={reset} />}
      okButton={
        <DialogButton
          variant="create"
          disabled={!isDirty || !!validationError}
          onClick={async () => {
            await saveData();
            reset();
          }}
        />
      }
      width={1024}
    >
      <React.Suspense fallback={<div />}>
        <ProgramSearchInput onChange={onChangeProgram} value={program} />
        {!program ? null : isLoading ? <BasicSpinner /> : JsonForm}
      </React.Suspense>
    </Modal>
  );
};
