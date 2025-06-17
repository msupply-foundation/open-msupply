import { useEffect, useMemo } from 'react';
import {
  useConfirmationModal,
  useTranslation,
  UpdatePatientInput,
  DocumentRegistryCategoryNode,
  useNotification,
  useQueryClient,
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

import defaultPatientSchema from '../PatientView/DefaultPatientSchema.json';
import defaultPatientUISchema from '../PatientView/DefaultPatientUISchema.json';
import { PRESCRIPTION } from '../../../../invoices/src/Prescriptions/api/hooks/keys';

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

export const usePatientEditForm = (patientId: string, onClose: () => void) => {
  const t = useTranslation();
  const { mutateAsync: updatePatient } = usePatient.document.update();
  const { error } = useNotification();
  const queryClient = useQueryClient();

  const { documentName, setDocumentName } = usePatientStore();
  const { data: currentPatient, isLoading: isCurrentPatientLoading } =
    usePatient.document.get(patientId);
  const { data: patientRegistries, isLoading: isPatientRegistryLoading } =
    useDocumentRegistry.get.documentRegistries({
      filter: {
        category: { equalTo: DocumentRegistryCategoryNode.Patient },
      },
    });
  const patientRegistry = patientRegistries?.nodes[0];
  const isLoading = isCurrentPatientLoading || isPatientRegistryLoading;

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
  }, [currentPatient, patientRegistry]);

  const accessor: JsonFormData<SavedDocument | void> = patientRegistry
    ? {
        loadedData: inputData?.data,
        isLoading: false,
        error: undefined,
        isCreating: false,
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
        isCreating: false,
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

  const { JsonForm, saveData, isSaving, isDirty, validationError, revert } =
    useJsonFormsHandler(
      {
        documentName: documentName,
        patientId: patientId,
      },
      accessor
    );

  const handleProgramPatientSave = useUpsertProgramPatient();
  const handlePatientSave = async (input: UpdatePatientInput) => {
    await updatePatient(input);
  };

  const handleSave = async () => {
    try {
      const savedDocument = await saveData();
      queryClient.invalidateQueries([PRESCRIPTION]);
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

  return {
    JsonForm,
    save,
    onClose,
    isLoading,
    isSaving,
    isDirty,
    validationError,
    currentPatient,
    revert,
  };
};
