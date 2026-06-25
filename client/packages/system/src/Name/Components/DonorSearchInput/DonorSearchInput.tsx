import React from 'react';
import {
  InfiniteSearchPicker,
  NameFilterInput,
  useTranslation,
} from '@openmsupply-client/common';
import { NameRowFragment, useName } from '../../api';
import { getNameOptionRenderer } from '../NameOptionRenderer';

export interface DonorSearchInputProps {
  onChange: (donor: NameRowFragment | null) => void;
  width?: number;
  fullWidth?: boolean;
  donorId: string | null;
  disabled?: boolean;
  clearable?: boolean;
}

export const DonorSearchInput = ({
  onChange,
  width = 250,
  fullWidth = false,
  donorId,
  disabled = false,
  clearable = false,
}: DonorSearchInputProps) => {
  const t = useTranslation();
  const NameOptionRenderer = getNameOptionRenderer(t('label.on-hold'));

  return (
    <InfiniteSearchPicker<NameRowFragment, NameFilterInput>
      onChange={onChange}
      currentId={donorId ?? undefined}
      useInfiniteData={useName.document.donorsInfinite}
      useGetById={useName.document.get}
      getOptionLabel={option => option.name}
      getOptionCode={option => option.code}
      renderOption={NameOptionRenderer}
      getOptionDisabled={option => option.isOnHold}
      disabled={disabled}
      clearable={clearable}
      width={fullWidth ? undefined : width}
      popperMinWidth={width}
      noOptionsText={t('label.no-options')}
    />
  );
};
