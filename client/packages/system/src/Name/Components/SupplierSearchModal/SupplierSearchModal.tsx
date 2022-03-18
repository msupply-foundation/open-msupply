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
    <Box display="flex" alignItems="flex-end" gap={1} height={25}>
      <Box display="flex" flexDirection="row" gap={1} width={110}>
        <Box flex={0} style={{ height: 24, minWidth: 20 }}>
          {!!item.store && <HomeIcon fontSize="small" />}
        </Box>
        <Typography
          overflow="hidden"
          fontWeight="bold"
          textOverflow="ellipsis"
          sx={{
            whiteSpace: 'no-wrap',
          }}
        >
          {item.code}
        </Typography>
      </Box>
      <Typography>{item.name}</Typography>
    </Box>
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
      onChange={(_, name: NameRowFragment | NameRowFragment[] | null) => {
        if (name && !(name instanceof Array)) onChange(name);
      }}
    />
  );
};
