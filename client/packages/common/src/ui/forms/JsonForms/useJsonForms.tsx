import React, { useEffect, useState } from 'react';
import { useNavigate } from '@openmsupply-client/common';
import {
  Box,
  DialogButton,
  LoadingButton,
  useConfirmationModal,
  useTranslation,
  useNotification,
  useDirtyCheck,
  useConfirmOnLeaving,
} from '@openmsupply-client/common';
import { JsonForms } from '@jsonforms/react';
import { materialRenderers } from '@jsonforms/material-renderers';
import {
  stringTester,
  TextField,
  selectTester,
  Selector,
  groupTester,
  Group,
  labelTester,
  Label,
  dateTester,
  Date,
  arrayTester,
  Array,
} from './components';

// Temporarily hard-coded examples until we connect to database
import patient from './jsonTemp/patient_1.json';
import schema from './jsonTemp/schema.json';
import uiSchema from './jsonTemp/ui-schema.json';
import { JsonFormsRendererRegistryEntry } from '@jsonforms/core';

export type JsonData = {
  [key: string]: string | number | boolean | null | unknown | JsonData;
};

interface JsonFormsComponentProps {
  data: JsonData;
  setData: (data: JsonData) => void;
  renderers: JsonFormsRendererRegistryEntry[];
}

const FormComponent = ({
  data,
  setData,
  renderers,
}: JsonFormsComponentProps) => {
  return (
    <JsonForms
      schema={schema}
      uischema={uiSchema}
      data={data}
      renderers={renderers}
      // cells={materialCells}
      onChange={({ errors, data }) => {
        setData(data);
        if (errors && errors.length) console.warn('Errors: ', errors);
      }}
    />
  );
};

interface JsonFormOptions {
  showButtonPanel?: boolean;
  onCancel?: () => void;
  saveConfirmationMessage?: string;
  cancelConfirmationMessage?: string;
  saveSuccessMessage?: string;
}

export const useJsonForms = (
  docName: string | undefined,
  options: JsonFormOptions = {}
) => {
  const [data, setData] = useState<JsonData>(patient); // Replace with DB query hook
  const [loading] = useState(false); // Replace with DB query hook
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | false>(false);
  const t = useTranslation('common');
  const { success, error: errorNotification } = useNotification();
  const navigate = useNavigate();
  const { isDirty, setIsDirty } = useDirtyCheck();

  const {
    showButtonPanel = true,
    onCancel = () => navigate(-1),
    saveConfirmationMessage = t('messages.confirm-save-generic'),
    cancelConfirmationMessage = t('messages.confirm-cancel-generic'),
    saveSuccessMessage = t('success.data-saved'),
  } = options;

  useConfirmOnLeaving(isDirty);

  useEffect(() => {
    if (!docName) setError('No document associated with this record');
  }, []);

  const updateData = (newData: JsonData) => {
    setIsDirty(true);
    setData(newData);
  };

  const saveData = async () => {
    setSaving(true);
    // Run mutation...
    console.log('Saving data...');
    // Temporary for UI demonstration
    setTimeout(() => {
      try {
        setSaving(false);
        const successSnack = success(saveSuccessMessage);
        successSnack();
        setSaving(false);
        setIsDirty(false);
      } catch {
        const errorSnack = errorNotification(t('error.problem-saving'));
        errorSnack();
      }
    }, 1000);
  };

  const renderers = [
    // We should be able to remove materialRenderers once we are sure we have custom components to cover all cases.
    ...materialRenderers,
    { tester: stringTester, renderer: TextField },
    { tester: selectTester, renderer: Selector },
    { tester: groupTester, renderer: Group },
    { tester: labelTester, renderer: Label },
    { tester: dateTester, renderer: Date },
    { tester: arrayTester, renderer: Array },
  ];

  const showSaveConfirmation = useConfirmationModal({
    onConfirm: saveData,
    message: saveConfirmationMessage,
    title: t('heading.are-you-sure'),
  });

  const showCancelConfirmation = useConfirmationModal({
    onConfirm: onCancel,
    message: cancelConfirmationMessage,
    title: t('heading.are-you-sure'),
  });

  const ButtonPanel = () => (
    <Box id="button-panel" paddingBottom={5} display="flex" gap={5}>
      <LoadingButton
        onClick={() => showSaveConfirmation()}
        isLoading={saving}
        color="secondary"
      >
        {t('button.save')}
      </LoadingButton>
      <DialogButton variant="cancel" onClick={() => showCancelConfirmation()} />
    </Box>
  );

  return {
    JsonForm: (
      <Box
        id="document-display"
        display="flex"
        flexDirection="column"
        justifyContent="flex-start"
        alignItems="center"
        width="100%"
        gap={2}
        paddingX={10}
      >
        <FormComponent
          data={data}
          setData={updateData}
          // setError={setError}
          renderers={renderers}
        />
        {showButtonPanel && <ButtonPanel />}
      </Box>
    ),
    saveData,
    loading,
    error,
  };
};
