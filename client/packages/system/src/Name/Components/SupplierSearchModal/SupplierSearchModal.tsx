import React, { FC } from 'react';
import {
  ListSearch,
  useTranslation,
  DefaultAutocompleteItemOption,
  AutocompleteOptionRenderer,
  Typography,
  HomeIcon,
  Box,
} from '@openmsupply-client/common';
import { useSuppliers, NameRowFragment } from '../../api';
import { NameSearchProps } from '../../utils';

const optionRenderer: AutocompleteOptionRenderer<NameRowFragment> = (
  props,
  item
) => (
  <DefaultAutocompleteItemOption {...props}>
    <Typography
      sx={{
        marginInlineEnd: '10px',
        fontWeight: 'bold',
        width: 110,
      }}
    >
      <Box display="flex" alignItems="flex-end" gap={1}>
        <Box flex={0} style={{ height: 24, width: 20 }}>
          {!!item.store && <HomeIcon fontSize="small" />}
        </Box>
        <Box flex={1}>{item.code}</Box>
      </Box>
    </Typography>
    <Typography>{item.name}</Typography>
  </DefaultAutocompleteItemOption>
);

export const SupplierSearchModal: FC<NameSearchProps> = ({
  open,
  onClose,
  onChange,
}) => {
  const { data, isLoading } = useSuppliers();
  const t = useTranslation('app');

  return (
    <ListSearch
      loading={isLoading}
      open={open}
      options={data?.nodes ?? []}
      onClose={onClose}
      title={t('suppliers')}
      renderOption={optionRenderer}
      onChange={(_, name: NameRowFragment | null) => {
        if (name) onChange(name);
      }}
    />
  );
};
