import React, { useEffect, useState } from 'react';
import {
  useTranslation,
  useNotification,
  useConfirmOnLeaving,
} from '@openmsupply-client/common';
import { JsonData, JsonForm } from './common';
import { DocumentRegistryFragment } from '@openmsupply-client/programs';
import { useDocumentLoader } from './useDocumentLoader';
import _ from 'lodash';
import { JsonFormsRendererRegistryEntry } from '@jsonforms/core';
import {
  EncounterLineChart,
  encounterLineChartTester,
  BMI,
  bmiTester,
  DateOfBirth,
  dateOfBirthTester,
  IdGenerator,
  idGeneratorTester,
  QuantityPrescribed,
  quantityPrescribedTester,
  AdherenceScore,
  adherenceScoreTester,
  PreviousEncounterField,
  previousEncounterFieldTester,
  DecisionTreeControl,
  decisionTreeTester,
  encounterProgramEventTester,
  EncounterProgramEvent,
} from './components';

// https://stackoverflow.com/questions/57874879/how-to-treat-missing-undefined-properties-as-equivalent-in-lodashs-isequalwit
// TODO: handle undefined and empty string as equal? e.g. initial data is undefined and current data is ""
const isEqualIgnoreUndefined = (
  a: JsonData | undefined,
  b: JsonData | undefined
) => {
  const comparisonFunc = (a: JsonData | undefined, b: JsonData | undefined) => {
    if (_.isArray(a) || _.isArray(b)) return;
    if (!_.isObject(a) || !_.isObject(b)) return;

    if (!_.includes(a, undefined) && !_.includes(b, undefined)) return;

    // Call recursively, after filtering all undefined properties
    return _.isEqualWith(
      _.omitBy(a, value => value === undefined),
      _.omitBy(b, value => value === undefined),
      comparisonFunc
    );
  };
  return _.isEqualWith(a, b, comparisonFunc);
};

export type SavedDocument = {
  id: string;
  name: string;
  type: string;
};

export type SaveDocumentMutation = (
  jsonData: unknown,
  formSchemaId: string,
  parent?: string
) => Promise<SavedDocument>;

interface JsonFormOptions {
  onCancel?: () => void;
  handleSave?: SaveDocumentMutation;
}

/**
 * Information required to create a new document
 */
export interface CreateDocument {
  data: JsonData;
  documentRegistry: DocumentRegistryFragment;
}

const additionalRenderers: JsonFormsRendererRegistryEntry[] = [
  { tester: idGeneratorTester, renderer: IdGenerator },
  { tester: dateOfBirthTester, renderer: DateOfBirth },
  { tester: encounterLineChartTester, renderer: EncounterLineChart },
  { tester: quantityPrescribedTester, renderer: QuantityPrescribed },
  { tester: bmiTester, renderer: BMI },
  { tester: adherenceScoreTester, renderer: AdherenceScore },
  {
    tester: previousEncounterFieldTester,
    renderer: PreviousEncounterField,
  },
  { tester: decisionTreeTester, renderer: DecisionTreeControl },
  { tester: encounterProgramEventTester, renderer: EncounterProgramEvent },
];

export const useJsonForms = (
  docName: string | undefined,
  options: JsonFormOptions = {},
  createDoc?: CreateDocument
) => {
  const {
    data: loadedData,
    isLoading,
    documentId,
    documentRegistry,
    error,
  } = useDocumentLoader(docName, createDoc);
  const [initialData, setInitialData] = useState(loadedData);
  useEffect(() => {
    setInitialData(loadedData);
  }, [loadedData]);
  // current modified data
  const [data, setData] = useState<JsonData | undefined>();
  const [isSaving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState<boolean>();
  const t = useTranslation('common');
  const [validationError, setValidationError] = useState<string | false>(false);
  const { success, error: errorNotification } = useNotification();

  useConfirmOnLeaving(isDirty);

  // returns the document name
  const saveData = async (): Promise<string | undefined> => {
    if (data === undefined) {
      return undefined;
    }
    setSaving(true);

    // Run mutation...
    try {
      const result = await options.handleSave?.(
        data,
        documentRegistry?.formSchemaId ?? '',
        documentId
      );

      const successSnack = success(t('success.data-saved'));
      successSnack();

      setInitialData(data);
      return result?.name;
    } catch (err) {
      const errorSnack = errorNotification(t('error.problem-saving'));
      errorSnack();
    } finally {
      setSaving(false);
    }
  };

  const revert = () => {
    setIsDirty(false);
    setData(initialData);
  };

  const updateData = (newData: JsonData) => {
    setData(newData);
  };

  useEffect(() => {
    const dirty =
      isSaving ||
      isLoading ||
      // not sure why isDirty should be set if nothing has changed.. do we allow saving when the initial createDoc is presented?
      // I've disabled, as this means that refreshing a page after rendering with createDoc set will prompt the user even
      // when the modal is cancelled
      // !!createDoc ||
      !isEqualIgnoreUndefined(initialData, data);
    setIsDirty(dirty);
    if (data === undefined) {
      setData(initialData);
    }
  }, [initialData, data, isSaving, isLoading]);

  useEffect(() => {
    setData(initialData);
    return () => setIsDirty(false);
  }, [initialData]);

  return {
    JsonForm: (
      <JsonForm
        data={data}
        jsonSchema={documentRegistry?.jsonSchema ?? {}}
        uiSchema={documentRegistry?.uiSchema ?? { type: 'Control' }}
        isError={!!error}
        isLoading={isLoading}
        setError={setValidationError}
        updateData={updateData}
        additionalRenderers={additionalRenderers}
        config={{
          documentName: docName,
        }}
      />
    ),
    data,
    setData,
    saveData,
    revert,
    isSaving,
    isLoading,
    isDirty: isDirty ?? false,
    error,
    validationError,
  };
};
