import React from 'react';
import {
  AppBarContentPortal,
  Box,
  FilterDefinition,
  FilterMenu,
  SensorNodeType,
  useTranslation,
} from '@openmsupply-client/common';
import { Switch } from '@common/components';

interface ToolbarProps {
  activeOnly: boolean;
  onToggleActiveOnly: (value: boolean) => void;
}

export const Toolbar = ({ activeOnly, onToggleActiveOnly }: ToolbarProps) => {
  const t = useTranslation();

  const filters: FilterDefinition[] = [
    {
      type: 'text',
      name: t('label.serial'),
      urlParameter: 'serial',
      isDefault: true,
    },
    {
      type: 'text',
      name: t('label.location'),
      urlParameter: 'locationCode',
      isDefault: true,
    },
    {
      type: 'enum',
      name: t('label.sensor-type'),
      urlParameter: 'type',
      options: [
        { label: t('label.berlinger'), value: SensorNodeType.Berlinger },
        { label: t('label.rtmd'), value: SensorNodeType.BlueMaestro },
        { label: t('label.laird'), value: SensorNodeType.Laird },
        { label: t('label.log-tag'), value: SensorNodeType.LogTag },
      ],
    },
  ];

  return (
    <AppBarContentPortal
      sx={{
        paddingBottom: '16px',
        flex: 1,
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      <FilterMenu filters={filters} />
      <Box sx={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
        <Switch
          checked={activeOnly}
          onChange={(_, checked) => onToggleActiveOnly(checked)}
          label={t('label.active-only')}
          labelPlacement="end"
          size="small"
        />
      </Box>
    </AppBarContentPortal>
  );
};
