import {
  useIntlUtils,
  useMutation,
  useQueryClient,
} from '@openmsupply-client/common';
import { NAME_PROPERTIES_KEY } from '@openmsupply-client/system';
import { useName } from '@openmsupply-client/system';
import { useHostApi } from '../utils/useHostApi';
import {
  gapsNameProperties,
  LocalisedNamePropertyConfig,
  populationNameProperties,
} from './namePropertyData';
import { gapsKeys, forecastingKeys } from './namePropertyKeys';

interface PropertyConfigurations {
  properties: LocalisedNamePropertyConfig;
  isConfigured: boolean;
  keys: string[];
}

export type PropertyType = 'gaps' | 'forecasting';

export const useConfigureNameProperties = () => {
  const api = useHostApi();
  const queryClient = useQueryClient();
  const { currentLanguage } = useIntlUtils();
  const { gapsConfigured, forecastingConfigured: populationConfigured } =
    useCheckConfiguredProperties();

  const propertyConfigurations: Record<PropertyType, PropertyConfigurations> = {
    gaps: {
      properties: gapsNameProperties,
      isConfigured: gapsConfigured,
      keys: gapsKeys,
    },
    forecasting: {
      properties: populationNameProperties,
      isConfigured: populationConfigured,
      keys: forecastingKeys,
    },
  };

  const getProperties = (propertyType: PropertyType) => {
    const localiseProperties = (property: LocalisedNamePropertyConfig) =>
      property[currentLanguage] ?? property.en;

    const primaryConfig = propertyConfigurations[propertyType];
    const primaryProperties = localiseProperties(primaryConfig.properties);

    return primaryProperties;
  };

  return useMutation(
    (propertyType: PropertyType) => {
      const properties = getProperties(propertyType);
      return api.configureNameProperties(properties);
    },
    {
      onSuccess: () => queryClient.invalidateQueries(NAME_PROPERTIES_KEY),
    }
  );
};

interface NamePropertyStatus {
  gapsConfigured: boolean;
  forecastingConfigured: boolean;
}

export const useCheckConfiguredProperties = (): NamePropertyStatus => {
  const { data } = useName.document.properties();

  const gapsConfigured =
    data?.some(nameProperty =>
      gapsKeys
        // Exclude the populationKeys as they'll be present if "population" has
        // been initialised -- they are present in both types
        .filter(key => !forecastingKeys.includes(key))
        .includes(nameProperty.property.key)
    ) ?? false;

  const forecastingConfigured =
    data?.some(nameProperty =>
      forecastingKeys.includes(nameProperty.property.key)
    ) ?? false;

  return {
    gapsConfigured,
    forecastingConfigured,
  };
};
