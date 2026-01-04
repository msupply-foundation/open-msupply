import React from 'react';
import {
  useTranslation,
  Box,
  Typography,
  PropertyInput,
  InputWithLabelRow,
  useIsCentralServerApi,
  useIsGapsStoreOnly,
  PropertyNodeValueType,
  NamePropertyNode,
  useAuthContext,
  UserPermission,
} from '@openmsupply-client/common';
import { DraftProperties } from './useDraftStoreProperties';

interface StorePropertiesProps {
  propertyConfigs: NamePropertyNode[];
  draftProperties: DraftProperties;
  updateProperty: (update: DraftProperties) => void;
}

export const StoreProperties = ({
  propertyConfigs,
  draftProperties,
  updateProperty,
}: StorePropertiesProps) => {
  const t = useTranslation();
  const isCentralServer = useIsCentralServerApi();
  const isGapsStore = useIsGapsStoreOnly();
  const { userHasPermission } = useAuthContext();

  return !propertyConfigs?.length ? (
    <Typography sx={{ textAlign: 'center' }}>
      {t('messages.no-properties')}
    </Typography>
  ) : (
    <Box
      sx={theme => ({
        [theme.breakpoints.down('sm')]: {
          width: '95%',
          minWidth: '340px',
          paddingX: '2em',
        },
        width: '600px',
        display: 'grid',
        gap: 1,
      })}
    >
      {propertyConfigs
        .filter(
          p => p.property.key !== 'latitude' && p.property.key !== 'longitude'
        )
        .map(p => (
          <Row
            key={p.id}
            label={p.property.name}
            isGapsStore={isGapsStore}
            inputProperties={{
              disabled:
                (!isCentralServer && !p.remoteEditable) ||
                !userHasPermission(UserPermission.NamePropertiesMutate),
              valueType: p.property.valueType,
              allowedValues: p.property.allowedValues?.split(','),
              value: draftProperties[p.property.key],
              onChange: v =>
                updateProperty({
                  [p.property.key]: v ?? null,
                }),
            }}
          />
        ))}
    </Box>
  );
};

type PropertyValue = string | number | boolean | undefined;
type PropertyInput = {
  valueType: PropertyNodeValueType;
  allowedValues?: string[];
  value: PropertyValue | null;
  onChange: (value: PropertyValue) => void;
  disabled?: boolean;
};

const Row = ({
  key,
  label,
  isGapsStore,
  inputProperties,
}: {
  key: string;
  label: string;
  isGapsStore: boolean;
  inputProperties: PropertyInput;
}) => {
  if (!isGapsStore)
    return (
      <InputWithLabelRow
        key={key}
        label={label}
        sx={{ width: '100%' }}
        labelProps={{
          sx: {
            width: '250px',
            fontSize: '16px',
            paddingRight: 2,
          },
        }}
        Input={
          <Box flex={1}>
            <PropertyInput {...inputProperties} />
          </Box>
        }
      />
    );

  return (
    <Box paddingTop={1.5}>
      <Typography
        sx={{
          fontSize: '1rem!important',
          fontWeight: 'bold',
        }}
      >
        {label}
      </Typography>
      <PropertyInput {...inputProperties} />
    </Box>
  );
};
