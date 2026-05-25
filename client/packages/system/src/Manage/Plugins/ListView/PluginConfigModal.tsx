import React, { useEffect, useState } from 'react';
import {
  BasicSpinner,
  Box,
  DialogButton,
  PluginConfiguration,
  Typography,
  useDialog,
  useNotification,
  usePluginProvider,
  useTranslation,
} from '@openmsupply-client/common';
// JsonForm lives in `programs` because that package owns the JSON Forms
// renderer registry (clinical widgets etc.). Plugin config doesn't need any of
// the clinical renderers, but until the renderer is extracted to a generic
// package we reuse `programs` like ReportArgumentsModal already does. The
// `system` → `programs` import isn't listed in package.json and resolves via
// workspace hoisting — same pattern as ReportArgumentsModal.
import { JsonData, JsonForm } from '@openmsupply-client/programs';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { usePluginConfiguration } from '../api';

interface PluginConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  pluginCode: string;
}

export const PluginConfigModal = ({
  isOpen,
  onClose,
  pluginCode,
}: PluginConfigModalProps) => {
  const t = useTranslation();
  const { error, success } = useNotification();
  const { cachedPluginBundles } = usePluginProvider();
  const slot: PluginConfiguration | undefined =
    cachedPluginBundles[pluginCode]?.configuration;

  const { configuration, isLoading, isError, save, isSaving } =
    usePluginConfiguration(pluginCode);

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  // Seed the local form value once the loaded row resolves; from then on the
  // form owns its state until save.
  const [value, setValue] = useState<unknown>(undefined);
  useEffect(() => {
    if (isLoading) return;
    setValue(configuration?.data ?? slot?.defaultConfig);
  }, [isLoading, configuration, slot]);

  const onOk = async () => {
    try {
      await save(value);
      success(t('messages.plugin-config-saved'))();
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      error(`${t('error.unable-to-save-plugin-config')}: ${message}`)();
    }
  };

  // The bundle MUST have a configuration slot if we opened the modal; the list
  // view gates the click on that. If it's missing here, something went wrong.
  if (!slot) {
    return (
      <Modal title={t('title.configure-plugin')}>
        <Typography color="error">
          {t('error.plugin-not-loaded', { code: pluginCode })}
        </Typography>
      </Modal>
    );
  }

  const renderBody = () => {
    if (isLoading || value === undefined) return <BasicSpinner inline />;
    if (isError)
      return (
        <Typography color="error">{t('error.unable-to-load-data')}</Typography>
      );

    if (slot.Component) {
      const Component = slot.Component;
      return <Component value={value} onChange={setValue} />;
    }

    if (slot.jsonForms) {
      return (
        <JsonForm
          jsonSchema={slot.jsonForms.schema as JsonSchema}
          uiSchema={slot.jsonForms.uiSchema as UISchemaElement}
          data={value as JsonData}
          isError={false}
          isLoading={false}
          updateData={next => setValue(next)}
        />
      );
    }

    return (
      <Typography>{t('messages.plugin-no-configuration-ui')}</Typography>
    );
  };

  return (
    <Modal
      title={t('title.configure-plugin')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          variant="ok"
          onClick={onOk}
          disabled={isSaving || isLoading || value === undefined}
        />
      }
    >
      <Box minWidth={500} padding={2}>
        {renderBody()}
      </Box>
    </Modal>
  );
};
