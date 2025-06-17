import React, { useCallback, useEffect, useMemo } from 'react';
import {
  useConfirmationModal,
  Box,
  useTranslation,
  InsertPatientInput,
  UpdatePatientInput,
  BasicSpinner,
  DocumentRegistryCategoryNode,
  useNavigate,
  RouteBuilder,
  FnUtils,
  useUrlQuery,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { usePatient } from '../api';
import {
  JsonFormData,
  FormInputData,
  SaveDocumentMutation,
  SavedDocument,
  SchemaData,
  useDocumentRegistry,
  useJsonFormsHandler,
  usePatientStore,
  PatientSchema,
} from '@openmsupply-client/programs';
import { Footer } from './Footer';

import defaultPatientSchema from './DefaultPatientSchema.json';
import defaultPatientUISchema from './DefaultPatientUISchema.json';
import { usePrescription } from '@openmsupply-client/invoices/src/Prescriptions';

const DEFAULT_SCHEMA: SchemaData = {
  formSchemaId: undefined,
  jsonSchema: defaultPatientSchema,
  uiSchema: defaultPatientUISchema,
};

const useUpsertPatient = (
  create: boolean
): ((input: unknown) => Promise<void>) => {
  const { mutateAsync: insertPatient } = usePatient.document.insert();
  const { mutateAsync: updatePatient } = usePatient.document.update();
  return async (input: unknown) => {
    if (create) {
      await insertPatient(input as InsertPatientInput);
    } else {
      await updatePatient(input as UpdatePatientInput);
    }
  };
};

const useUpsertProgramPatient = (): SaveDocumentMutation => {
  const { mutateAsync: insertPatient } =
    usePatient.document.insertProgramPatient();
  const { mutateAsync: updatePatient } =
    usePatient.document.updateProgramPatient();
  return async (jsonData: unknown, schemaId: string, parent?: string) => {
    if (parent === undefined) {
      const result = await insertPatient({
        data: jsonData,
        schemaId,
      });
      if (!result.document) throw Error('Inserted document not set!');
      return result.document;
    } else {
      const result = await updatePatient({
        data: jsonData,
        parent,
        schemaId,
      });
      if (!result.document) throw Error('Inserted document not set!');
      return result.document;
    }
  };
};

export const PatientDetailView = ({
  patientId,
  onEdit,
}: {
  patientId: string;
  onEdit: (isDirty: boolean) => void;
}) => {
  const t = useTranslation();
  const {
    documentName,
    setDocumentName,
    createNewPatient,
    setCreateNewPatient,
  } = usePatientStore();

  const navigate = useNavigate();
  const { urlQuery } = useUrlQuery();
  const fromPrescription = urlQuery['previousPath'] === AppRoute.Prescription;

  const { data: currentPatient, isLoading: isCurrentPatientLoading } =
    usePatient.document.get(patientId);
  const { data: patientRegistries, isLoading: isPatientRegistryLoading } =
    useDocumentRegistry.get.documentRegistries({
      filter: {
        category: { equalTo: DocumentRegistryCategoryNode.Patient },
      },
    });
  const {
    create: { create: createPrescription },
  } = usePrescription();

  const isLoading = isCurrentPatientLoading || isPatientRegistryLoading;

  const patientRegistry = patientRegistries?.nodes[0];
  const isCreatingPatient = !!createNewPatient;
  // we have to memo the data to avoid an infinite render loop
  const inputData = useMemo<FormInputData | undefined>(() => {
    if (!!createNewPatient) {
      // Use the unsaved patient information from createNewPatient, i.e. from a "create patient"
      // request
      return {
        schema: patientRegistry ?? DEFAULT_SCHEMA,
        data: {
          id: createNewPatient.id,
          code: createNewPatient.code,
          code2: createNewPatient.code2,
          firstName: createNewPatient.firstName,
          lastName: createNewPatient.lastName,
          gender: createNewPatient.gender,
          dateOfBirth: createNewPatient.dateOfBirth,
          phone: createNewPatient.phone,
          address1: createNewPatient.address1,
          isDeceased: createNewPatient.isDeceased,
          dateOfDeath: createNewPatient.dateOfDeath,
          extension: {},
        },
        isCreating: true,
      };
    } else if (!!currentPatient && !currentPatient.document) {
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

  const handleProgramPatientSave = useUpsertProgramPatient();
  const handlePatientSave = useUpsertPatient(isCreatingPatient);

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
          await handlePatientSave({
            ...newData,
            nextOfKinId: patientData?.nextOfKin?.id,
            nextOfKinName: patientData?.nextOfKin?.name,
          });
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

  useEffect(() => {
    return () => setCreateNewPatient(undefined);
  }, [setCreateNewPatient]);

  const save = useCallback(async () => {
    const savedDocument = await saveData();
    // patient has been created => unset the create request data
    setCreateNewPatient(undefined);
    if (savedDocument) {
      setDocumentName(savedDocument.name);
    }
    // Creates a new prescription and redirects to the prescriptions page
    // if the patient was created from there.
    if (fromPrescription) {
      const invoice = await createPrescription({
        id: FnUtils.generateUUID(),
        patientId,
      });
      navigate(
        RouteBuilder.create(AppRoute.Dispensary)
          .addPart(AppRoute.Prescription)
          .addPart(invoice?.id ?? '')
          .build()
      );
    }
  }, [saveData, setCreateNewPatient, setDocumentName]);

  useEffect(() => {
    if (!documentName && currentPatient) {
      setDocumentName(currentPatient?.document?.name);
    }
  }, [currentPatient, documentName, setDocumentName]);

  useEffect(() => {
    onEdit(isDirty);
  }, [isDirty, onEdit]);

  const showSaveConfirmation = useConfirmationModal({
    onConfirm: save,
    message: t('messages.confirm-save-generic'),
    title: t('heading.are-you-sure'),
  });

  if (isLoading) return <BasicSpinner />;
  return (
    <Box flex={1} display="flex" justifyContent="center">
      <Box style={{ maxWidth: 1200, flex: 1 }}>{JsonForm}</Box>
      <Footer
        documentName={documentName}
        isSaving={isSaving}
        isDirty={isDirty}
        validationError={validationError}
        inputData={inputData}
        showSaveConfirmation={showSaveConfirmation}
      />
    </Box>
  );
};
