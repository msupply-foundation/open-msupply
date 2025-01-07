import React, { FC, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuItem,
  useTranslation,
  AppBarContentPortal,
  Box,
  FilterController,
  StatusType,
} from '@openmsupply-client/common';
import { getStatusOptions } from '../utils';

export type AssetLogStatus = {
  label: string;
  value: StatusType;
};

export const Toolbar: FC<{
  filter: FilterController;
}> = ({ filter }) => {
  const t = useTranslation();

  const [selectedStatus, setSelectedStatus] = useState<AssetLogStatus | null>();

  const onFilterChange = (option?: AssetLogStatus) => {
    if (!option) {
      filter.onClearFilterRule('assetLogStatus');
      setSelectedStatus(null);
      return;
    }
    filter.onChangeStringFilterRule('assetLogStatus', 'equalTo', option.value);
    setSelectedStatus(option);
  };

  const options = getStatusOptions(t);
  return (
    <AppBarContentPortal
      sx={{
        paddingBottom: '16px',
        flex: 1,
        justifyContent: 'space-between',
        display: 'flex',
      }}
    >
      <Box
        display="flex"
        gap={2}
        sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }}
      >
        <DropdownMenu
          label={selectedStatus?.label ?? t('placeholder.filter-by-status')}
        >
          {options.map(option => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => {
                onFilterChange(option);
              }}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            onClick={() => {
              onFilterChange();
            }}
          >
            {t('label.clear-filter')}
          </DropdownMenuItem>
        </DropdownMenu>
      </Box>
    </AppBarContentPortal>
  );
};
