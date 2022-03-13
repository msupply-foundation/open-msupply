import React, { FC } from 'react';
import {
  ListSearch,
  useTranslation,
  DefaultAutocompleteItemOption,
  AutocompleteOptionRenderer,
  Typography,
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
        width: 75,
        color: item.store ? 'red' : undefined,
      }}
    >
      {item.code}
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
