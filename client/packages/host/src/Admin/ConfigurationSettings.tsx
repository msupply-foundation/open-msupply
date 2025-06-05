import React from 'react';

import {
  BaseButton,
  useIntlUtils,
  useTranslation,
} from '@openmsupply-client/common';
import { useName } from '@openmsupply-client/system';

import { Setting } from './Setting';

import {
  useConfigureNameProperties,
  useCheckConfiguredProperties,
  PropertyType,
} from '../api/hooks/settings/useConfigureNameProperties';

export const ConfigurationSettings = () => {
  const t = useTranslation();
  const { currentLanguage } = useIntlUtils();
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
        title={t('label.initialise-store-properties-gaps')}
        component={
          <BaseButton
            onClick={handleClick('gaps')}
            disabled={dataLoading || isLoading}
            title={t('tooltip.re-initialise-in-language', {
              language: currentLanguage,
            })}
          >
            {gapsConfigured
              ? t('button.re-initialise')
              : t('button.initialise')}
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
            disabled={dataLoading || isLoading}
            title={t('tooltip.re-initialise-in-language', {
              language: currentLanguage,
            })}
          >
            {populationConfigured
              ? t('button.re-initialise')
              : t('button.initialise')}
          </BaseButton>
        }
      />
    </>
  );
};
