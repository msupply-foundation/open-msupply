import React from 'react';

import { BaseButton, useTranslation } from '@openmsupply-client/common';
import { useName } from '@openmsupply-client/system';

import { Setting } from './Setting';

import { useConfigureNameProperties } from '../api/hooks/settings/useConfigureNameProperties';

export const ConfigurationSettings = () => {
  const { mutateAsync, isLoading } = useConfigureNameProperties();
  const t = useTranslation('app');

  const configure = async () => {
    await mutateAsync();
  };

  const { data, isLoading: dataLoading } = useName.document.properties();

  const propertiesAlreadyConfigured = !!data?.length;

  return (
    <Setting
      title={t('label.initialise-store-properties')}
      component={
        <BaseButton
          onClick={configure}
          disabled={dataLoading || isLoading || propertiesAlreadyConfigured}
        >
          {propertiesAlreadyConfigured
            ? t('label.initialised')
            : t('button.initialise')}
        </BaseButton>
      }
    />
  );
};
