import React, { useEffect, useMemo } from 'react';
import {
  DetailContainer,
  useConfirmationModal,
  Box,
  useTranslation,
  UpdatePatientInput,
  BasicSpinner,
  DocumentRegistryCategoryNode,
  UserPermission,
  DialogButton,
  useDialog,
  useNotification,
  SaveIcon,
  LoadingButton,
  useAuthContext,
} from '@openmsupply-client/common';
import { usePatient } from '../api';
import {
  JsonFormData,
  FormInputData,
  SavedDocument,
  SchemaData,
  useDocumentRegistry,
  useJsonFormsHandler,
  usePatientStore,
  PatientSchema,
  SaveDocumentMutation,
} from '@openmsupply-client/programs';

import defaultPatientSchema from './DefaultEditPatientSchema.json';
import defaultPatientUISchema from './DefaultEditPatientUISchema.json';

const DEFAULT_SCHEMA: SchemaData = {
  formSchemaId: undefined,
  jsonSchema: defaultPatientSchema,
  uiSchema: defaultPatientUISchema,
};

const useUpsertProgramPatient = (): SaveDocumentMutation => {
  const { mutateAsync: updateProgramPatient } =
    usePatient.document.updateProgramPatient();

  return async (jsonData: unknown, schemaId: string, parent?: string) => {
    const result = await updateProgramPatient({
      data: jsonData,
      parent: parent ? parent : '',
      schemaId,
    });
    if (!result.document) throw Error('Inserted document not set!');
    return result.document;
  };
};

export const EditPatientModal = ({
  isOpen,
  patientId,
  onClose,
}: {
  isOpen: boolean;
  patientId: string;
  onClose: (patientId?: string) => void;
}) => {
  const t = useTranslation();
  const { userHasPermission } = useAuthContext();

  const {
    documentName,
    setDocumentName,
    createNewPatient,
    // setCreateNewPatient,
  } = usePatientStore();

  const { mutateAsync: updatePatient } = usePatient.document.update();

  const { error } = useNotification();

  const { Modal } = useDialog({
    onClose,
    isOpen,
  });

  const { data: currentPatient, isLoading: isCurrentPatientLoading } =
    usePatient.document.get(patientId);
  const { data: patientRegistries, isLoading: isPatientRegistryLoading } =
    useDocumentRegistry.get.documentRegistries({
      filter: {
        category: { equalTo: DocumentRegistryCategoryNode.Patient },
      },
    });

  const isLoading = isCurrentPatientLoading || isPatientRegistryLoading;

  const patientRegistry = patientRegistries?.nodes[0];

  // we have to memo the data to avoid an infinite render loop
  const inputData = useMemo<FormInputData | undefined>(() => {
    if (!!currentPatient && !currentPatient.document) {
      // The loaded patient doesn't has a document. Use the information we got
      // (from the name table).
      return {
        schema: patientRegistry ?? DEFAULT_SCHEMA,
        data: {
          id: currentPatient.id,
          code: currentPatient.code,
          code2: currentPatient.code2 ?? undefined,
          firstName: currentPatient.firstName ?? undefined,
          lastName: currentPatient.lastName ?? undefined,
          gender: currentPatient.gender ?? undefined,
          dateOfBirth: currentPatient.dateOfBirth ?? undefined,
          dateOfDeath: currentPatient.dateOfDeath ?? undefined,
          isDeceased: currentPatient.isDeceased ?? undefined,
          phone: currentPatient.phone ?? undefined,
          address1: currentPatient.address1 ?? undefined,
          nextOfKin:
            currentPatient.nextOfKinId || currentPatient.nextOfKinName
              ? {
                  id: currentPatient.nextOfKinId ?? undefined,
                  name: currentPatient.nextOfKinName ?? undefined,
                }
              : undefined,
          extension: {},
        },
        isCreating: false,
      };
    } else if (currentPatient?.document) {
      // Take the data from the document
      return {
        schema: patientRegistry ?? DEFAULT_SCHEMA,
        data: currentPatient.documentDraft,
        isCreating: false,
      };
    }
  }, [createNewPatient, currentPatient, patientRegistry]);

  const isCreatingPatient = false;

  const handleProgramPatientSave = useUpsertProgramPatient();

  const handlePatientSave = async (input: UpdatePatientInput) => {
    await updatePatient(input);
  };

  const accessor: JsonFormData<SavedDocument | void> = patientRegistry
    ? {
        loadedData: inputData?.data,
        isLoading: false,
        error: undefined,
        isCreating: isCreatingPatient,
        schema: patientRegistry,
        save: async (data: unknown) => {
          await handleProgramPatientSave(
            data,
            patientRegistry.formSchemaId,
            currentPatient?.document?.id
          );
        },
      }
    : {
        loadedData: inputData?.data,
        isLoading: false,
        error: undefined,
        isCreating: isCreatingPatient,
        schema: DEFAULT_SCHEMA,
        save: async (data: unknown) => {
          const patientData = data as PatientSchema;
          const newData = Object.fromEntries(
            Object.entries(data ?? {}).filter(
              ([key]) =>
                key !== 'dateOfBirthIsEstimated' &&
                key !== 'nextOfKin' &&
                key !== 'extension'
            )
          );
          // map nextOfKin object to individual fields
          const input = {
            ...newData,
            nextOfKinId: patientData?.nextOfKin?.id,
            nextOfKinName: patientData?.nextOfKin?.name,
          };
          await handlePatientSave(input as UpdatePatientInput);
        },
      };

  const { JsonForm, saveData, isSaving, isDirty, validationError } =
    useJsonFormsHandler(
      {
        documentName: createNewPatient ? undefined : documentName,
        patientId: patientId,
      },
      accessor
    );

  const handleSave = async () => {
    try {
      const savedDocument = await saveData();

      if (savedDocument) {
        setDocumentName(savedDocument.name);
      }
      onClose();
    } catch (e) {
      const errorSnack = error((e as Error).message);
      errorSnack();
    }
  };

  const save = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-save-generic'),
    onConfirm: handleSave,
  });

  useEffect(() => {
    if (!documentName && currentPatient) {
      setDocumentName(currentPatient?.document?.name);
    }
  }, [currentPatient, documentName, setDocumentName]);

  if (isLoading) return <BasicSpinner />;

  if (isLoading) {
    return null;
  }

  return (
    <Modal
      title=""
      width={950}
      okButton={
        <LoadingButton
          color="secondary"
          disabled={
            !isDirty ||
            !!validationError ||
            !userHasPermission(UserPermission.PatientMutate)
          }
          isLoading={isSaving}
          onClick={() => save()}
          label={t('button.save')}
          startIcon={<SaveIcon />}
        />
      }
      cancelButton={
        <DialogButton
          variant="cancel"
          onClick={() => {
            onClose();
          }}
        />
      }
      slideAnimation={false}
    >
      <DetailContainer>
        <Box>{JsonForm}</Box>
      </DetailContainer>
    </Modal>
  );
};
