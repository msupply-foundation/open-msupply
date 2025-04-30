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
import { gapsKeys, populationKeys } from './namePropertyKeys';

interface PropertyConfigurations {
  properties: LocalisedNamePropertyConfig;
  isConfigured: boolean;
  keys: string[];
}

export type PropertyType = 'gaps' | 'population';

export const useConfigureNameProperties = () => {
  const api = useHostApi();
  const queryClient = useQueryClient();
  const { currentLanguage } = useIntlUtils();
  const { gapsConfigured, populationConfigured } = useCheckNamePropertyStatus();

  const propertyConfigurations: Record<PropertyType, PropertyConfigurations> = {
    gaps: {
      properties: gapsNameProperties,
      isConfigured: gapsConfigured,
      keys: gapsKeys,
    },
    population: {
      properties: populationNameProperties,
      isConfigured: populationConfigured,
      keys: populationKeys,
    },
  };

  const getProperties = (propertyType: PropertyType) => {
    const localiseProperties = (property: LocalisedNamePropertyConfig) =>
      property[currentLanguage] ?? property.en;

    const primaryConfig = propertyConfigurations[propertyType];
    const primaryProperties = localiseProperties(primaryConfig.properties);

    const properties = [...primaryProperties];

    Object.entries(propertyConfigurations).forEach(([type, config]) => {
      if (type !== propertyType && config.isConfigured)
        properties.push(...localiseProperties(config.properties));
    });

    return properties;
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
  populationConfigured: boolean;
}

// Temporary solution to check if the name/population properties are configured
// Add functionality to check store for 'GAPS Only' settings etc... (once available)
export const useCheckNamePropertyStatus = (): NamePropertyStatus => {
  const { data } = useName.document.properties();

  const gapsConfigured =
    data?.some(nameProperty =>
      gapsKeys
        .filter(key => key !== 'population_served') // Exclude - populationProperties can initialise with it as well
        .includes(nameProperty.property.key)
    ) ?? false;

  const populationConfigured =
    data?.some(nameProperty =>
      populationKeys.includes(nameProperty.property.key)
    ) ?? false;

  return {
    gapsConfigured,
    populationConfigured,
  };
};
