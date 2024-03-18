import React, { useEffect } from 'react';

import {
  useNotification,
  BasicTextInput,
  ButtonWithIcon,
  Box,
  NumericTextInput,
} from '@openmsupply-client/common';
import { SaveIcon } from '@common/icons';
import { useTranslation } from '@common/intl';
import { Setting } from './Setting';
import { useHost } from '../api';
import { SettingsSubHeading } from './SettingsSection';

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
      <Box display="flex" justifyContent="flex-end">
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
