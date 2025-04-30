import React from 'react';

import { BaseButton, useTranslation } from '@openmsupply-client/common';
import { useName } from '@openmsupply-client/system';

import { Setting } from './Setting';

import {
  useConfigureNameProperties,
  useCheckConfiguredProperties,
  PropertyType,
} from '../api/hooks/settings/useConfigureNameProperties';

export const ConfigurationSettings = () => {
  const t = useTranslation();

  const { mutateAsync, isLoading } = useConfigureNameProperties();
  const { isLoading: dataLoading } = useName.document.properties();
  const { gapsConfigured, populationConfigured } =
    useCheckConfiguredProperties();

  const handleClick = (propertyType: PropertyType) => async () => {
    await mutateAsync(propertyType);
  };

  return (
    <>
      <Setting
        title={t('label.initialise-store-properties')}
        component={
          <BaseButton
            onClick={handleClick('gaps')}
            disabled={dataLoading || isLoading || gapsConfigured}
          >
            {gapsConfigured ? t('label.initialised') : t('button.initialise')}
          </BaseButton>
        }
      />
      <Setting
        title={t(
          'label.initialise-store-properties-population-based-forecasting'
        )}
        component={
          <BaseButton
            onClick={handleClick('population')}
            disabled={dataLoading || isLoading || populationConfigured}
          >
            {populationConfigured
              ? t('label.initialised')
              : t('button.initialise')}
          </BaseButton>
        }
      />
    </>
  );
};
