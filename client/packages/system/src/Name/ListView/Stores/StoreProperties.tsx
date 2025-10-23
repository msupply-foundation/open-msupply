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
  IconButton,
  EditIcon,
  useEditModal,
} from '@openmsupply-client/common';
import { DraftProperties } from './useDraftStoreProperties';
import { SupplyLevelModal } from './SupplyLevelModal';

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

  const {
    isOpen,
    onOpen: handleSupplyModalOpen,
    onClose: handleSupplyModalClose,
  } = useEditModal();

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
            propertyKey={p.property.key}
            inputProperties={{
              disabled: !isCentralServer && !p.remoteEditable,
              valueType: p.property.valueType,
              allowedValues: p.property.allowedValues?.split(','),
              value: draftProperties[p.property.key],
              onChange: v =>
                updateProperty({
                  [p.property.key]: v ?? null,
                }),
            }}
            onEditSupplyLevel={handleSupplyModalOpen}
          />
        ))}
      {isOpen && (
        <SupplyLevelModal isOpen={isOpen} onClose={handleSupplyModalClose} />
      )}
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

interface RowProps {
  key: string;
  label: string;
  isGapsStore: boolean;
  inputProperties: PropertyInput;
  propertyKey: string;
  onEditSupplyLevel: () => void;
}

const Row = ({
  key,
  label,
  isGapsStore,
  inputProperties,
  propertyKey,
  onEditSupplyLevel,
}: RowProps) => {
  if (!isGapsStore)
    return (
      <>
        <Box sx={{ display: 'flex', flexDirection: 'row' }}>
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
          {propertyKey === 'supply_level' && (
            <IconButton
              label="edit supply level"
              icon={<EditIcon />}
              onClick={onEditSupplyLevel}
            />
          )}
        </Box>
      </>
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
