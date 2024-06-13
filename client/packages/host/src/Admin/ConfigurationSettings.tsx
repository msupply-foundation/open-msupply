import React from 'react';

import { BaseButton, useTranslation } from '@openmsupply-client/common';
import { Setting } from './Setting';

import { useConfigureNameProperties } from '../api/hooks/settings/useConfigureNameProperties';

export const ConfigurationSettings = () => {
  const { mutateAsync } = useConfigureNameProperties();
  const t = useTranslation();

  const configure = async () => {
    await mutateAsync();
  };

  return (
    <Setting
      title={t('Initialise store properties for GAPS')}
      component={
        <BaseButton onClick={configure}>{t('button.initialise')}</BaseButton>
      }
    />
  );
};
