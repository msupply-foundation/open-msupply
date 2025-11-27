import React from 'react';
import {
  BaseButton,
  useCallbackWithPermission,
  useEditModal,
  useIntlUtils,
  UserPermission,
  useTranslation,
} from '@openmsupply-client/common';
import { useName } from '@openmsupply-client/system';
import { Setting } from './Setting';
import {
  useConfigureNameProperties,
  useCheckConfiguredProperties,
  PropertyType,
} from '../api/hooks/settings/useConfigureNameProperties';
import { SupplyLevelModal } from './SupplyLevelModal';

export const ConfigurationSettings = () => {
  const t = useTranslation();
  const { currentLanguage } = useIntlUtils();
  const { mutateAsync, isLoading } = useConfigureNameProperties();
  const { isLoading: dataLoading } = useName.document.properties();
  const { gapsConfigured, forecastingConfigured } =
    useCheckConfiguredProperties();

  const { isOpen, onOpen, onClose } = useEditModal();

  const handleClick = (propertyType: PropertyType) => async () => {
    await mutateAsync(propertyType);
  };

  const handleSupplyModalClick = useCallbackWithPermission(
    UserPermission.EditCentralData,
    onOpen,
    t('error.no-supply-level-permission')
  );

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
            onClick={handleClick('forecasting')}
            disabled={dataLoading || isLoading}
            title={t('tooltip.re-initialise-in-language', {
              language: currentLanguage,
            })}
          >
            {forecastingConfigured
              ? t('button.re-initialise')
              : t('button.initialise')}
          </BaseButton>
        }
      />
      <Setting
        title={t('label.configure-supply-level')}
        component={
          <BaseButton onClick={handleSupplyModalClick}>
            {t('label.edit')}
          </BaseButton>
        }
      />
      {isOpen && <SupplyLevelModal isOpen={isOpen} onClose={onClose} />}
    </>
  );
};
