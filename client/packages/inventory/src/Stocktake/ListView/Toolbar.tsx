import React, { FC } from 'react';
import {
  useTranslation,
  AppBarContentPortal,
  FilterController,
  StocktakeNodeStatus,
  Autocomplete,
  AutocompleteOnChange,
  InputLabel,
  Box,
  useSimplifiedTabletUI,
} from '@openmsupply-client/common';

type StatusOption = {
  label: string;
  value: StocktakeNodeStatus;
};

export const Toolbar: FC<{
  filter: FilterController;
}> = ({ filter }) => {
  const t = useTranslation();
  const simplifiedTabletView = useSimplifiedTabletUI();

  const onFilterChange: AutocompleteOnChange<StatusOption> = (_, option) => {
    if (!option) {
      filter.onClearFilterRule('status');
      return;
    }
    filter.onChangeStringFilterRule('status', 'equalTo', option.value);
  };

  return simplifiedTabletView ? null : (
    <AppBarContentPortal
      sx={{
        paddingBottom: '16px',
        flex: 1,
        justifyContent: 'space-between',
        display: 'flex',
      }}
    >
      <Box display="flex" alignItems="center" gap={1}>
        <InputLabel>{t('placeholder.filter-by-status')}</InputLabel>
        <Autocomplete
          isOptionEqualToValue={(option, value) => option.value === value.value}
          width="150px"
          options={[
            { label: t('status.new'), value: StocktakeNodeStatus.New },
            {
              label: t('status.finalised'),
              value: StocktakeNodeStatus.Finalised,
            },
          ]}
          onChange={onFilterChange}
        />
      </Box>
    </AppBarContentPortal>
  );
};
