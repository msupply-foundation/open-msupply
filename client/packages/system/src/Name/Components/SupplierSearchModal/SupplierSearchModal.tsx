import React, { FC } from 'react';
import {
  ListSearch,
  RegexUtils,
  useTranslation,
} from '@openmsupply-client/common';
import { useSuppliers, NameRowFragment } from '../../api';
import { NameSearchProps } from '../../utils';
import { NameOptionRenderer } from '../NameOptionRenderer';

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
      renderOption={NameOptionRenderer}
      getOptionLabel={(option: NameRowFragment) => option.name}
      filterOptions={(options, state) =>
        options.filter(option =>
          RegexUtils.matchNameOrCode(option, state.inputValue)
        )
      }
      onChange={(_, name: NameRowFragment | NameRowFragment[] | null) => {
        if (name && !(name instanceof Array)) onChange(name);
      }}
    />
  );
};
