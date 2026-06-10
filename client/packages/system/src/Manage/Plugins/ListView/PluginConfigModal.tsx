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
  useWindowDimensions,
} from '@openmsupply-client/common';
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

  const { width: viewportWidth, height: viewportHeight } =
    useWindowDimensions();
  const modalWidth = Math.round(viewportWidth * 0.8);
  const modalHeight = Math.round(viewportHeight * 0.9);
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
      <Modal title={t('title.configure-plugin-code', { code: pluginCode })}>
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

    const Component = slot.Component;
    return <Component value={value} onChange={setValue} />;
  };

  return (
    <Modal
      title={t('title.configure-plugin-code', { code: pluginCode })}
      width={modalWidth}
      height={modalHeight}
      contentProps={{ sx: { overflowY: 'hidden' } }}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          variant="ok"
          onClick={onOk}
          disabled={isSaving || isLoading || value === undefined}
        />
      }
    >
      <Box width="100%" padding={2}>
        {renderBody()}
      </Box>
    </Modal>
  );
};
