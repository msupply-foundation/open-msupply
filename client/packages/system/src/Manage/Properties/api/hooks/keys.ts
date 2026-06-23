export const PROPERTY_CONFIG = 'property-config';

export const PropertyConfigKeys = {
  base: () => [PROPERTY_CONFIG] as const,
  list: () => [...PropertyConfigKeys.base(), 'list'] as const,
};
