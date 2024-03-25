import React, { useEffect } from 'react';

import {
  useNotification,
  BasicTextInput,
  ButtonWithIcon,
  Box,
  NumericTextInput,
  LoadingButton,
} from '@openmsupply-client/common';
import { CheckIcon, SaveIcon } from '@common/icons';
import { useTranslation } from '@common/intl';
import { Setting } from './Setting';
import { useHost } from '../api';
import { SettingsSubHeading } from './SettingsSection';
import { Environment } from '@openmsupply-client/config';

interface LabelPrinterSettings {
  address: string;
  labelHeight: number;
  labelWidth: number;
  port: number;
}
export const LabelPrinterSettings = () => {
  const t = useTranslation('app');
  const { error, success } = useNotification();
  const { mutateAsync: updateSettings } =
    useHost.settings.updateLabelPrinterSettings();
  const { data: settings } = useHost.settings.labelPrinterSettings();
  const [isTesting, setIsTesting] = React.useState(false);
  const [draft, setDraft] = React.useState<LabelPrinterSettings>({
    address: '',
    labelHeight: 290,
    labelWidth: 576,
    port: 9100,
  });

  const onChange = (patch: Partial<LabelPrinterSettings>) => {
    setDraft({ ...draft, ...patch });
  };

  const save = async () => {
    updateSettings(draft)
      .then(() => success(t('success.data-saved'))())
      .catch(() => {
        error(t('error.problem-saving'))();
      });
  };

  const test = () => {
    setIsTesting(true);
    fetch(Environment.PRINT_LABEL_TEST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async response => {
        if (response.status !== 200) {
          const text = await response.text();
          throw new Error(text);
        }
        return response.json();
      })
      .then(json => {
        if (!json.is_valid) {
          throw new Error('Invalid response');
        }
        const formatted = JSON.stringify(json, null, 2);
        success(`${t('messages.connected-to-printer')} ${formatted}`)();
      })
      .catch(e => {
        error(`${t('error.unable-to-connect-to-printer')} ${e.message}`)();
      })
      .finally(() => {
        setIsTesting(false);
      });
  };

  const isInvalid =
    !draft.address || !draft.port || !draft.labelHeight || !draft.labelWidth;

  useEffect(() => {
    if (settings) {
      setDraft({
        address: settings.address,
        labelHeight: settings.labelHeight,
        labelWidth: settings.labelWidth,
        port: settings.port,
      });
    }
  }, [settings]);

  return (
    <>
      <SettingsSubHeading title={t('settings.label-printing')} />
      <Setting
        component={
          <BasicTextInput
            value={draft.address}
            onChange={event => onChange({ address: event.target.value })}
          />
        }
        title={t('settings.printer-address')}
      />
      <Setting
        component={
          <NumericTextInput
            value={draft.port}
            noFormatting
            onChange={port => {
              if (port !== undefined) onChange({ port });
            }}
          />
        }
        title={t('settings.printer-port')}
      />
      <Setting
        component={
          <NumericTextInput
            value={draft.labelHeight}
            onChange={labelHeight => {
              if (labelHeight !== undefined) onChange({ labelHeight });
            }}
          />
        }
        title={t('settings.printer-label-height')}
      />
      <Setting
        component={
          <NumericTextInput
            value={draft.labelWidth}
            onChange={labelWidth => {
              if (labelWidth !== undefined) onChange({ labelWidth });
            }}
          />
        }
        title={t('settings.printer-label-width')}
      />
      <Box display="flex" justifyContent="flex-end" gap={1}>
        <LoadingButton
          startIcon={<CheckIcon />}
          isLoading={isTesting}
          onClick={test}
          disabled={isInvalid}
          sx={{ fontSize: '12px' }}
        >
          {t('button.test')}
        </LoadingButton>
        <ButtonWithIcon
          Icon={<SaveIcon />}
          label={t('button.save')}
          variant="contained"
          sx={{ fontSize: '12px' }}
          onClick={save}
          disabled={isInvalid}
        />
      </Box>
    </>
  );
};
