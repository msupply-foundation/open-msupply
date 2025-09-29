import React from 'react';
import {
  Autocomplete,
  AutocompleteOption,
  CloseIcon,
  MenuItem,
  useAuthContext,
  useTranslation,
} from '@openmsupply-client/common';
import { MasterListRowFragment, useMasterLists } from '../api';

interface MasterListSearchInputProps {
  selectedMasterList: MasterListRowFragment | null;
  width?: number | string;
  onChange: (masterList: MasterListRowFragment | null) => void;
  disabled: boolean;
  autoFocus?: boolean;
  clearable?: boolean;
  /** Alternative to `clearable`, ideal for tables where the X takes up valuable real estate */
  includeRemoveOption?: boolean;
  placeholder?: string;
}

interface MasterListOption {
  label: string;
  value: string | null;
  code?: string;
}

const getOptionLabel = (option: MasterListOption) => `${option.label}`;

const optionRenderer = (
  props: React.HTMLAttributes<HTMLLIElement>,
  masterList: MasterListOption
) => {
  const { style, ...rest } = props;

  return masterList.value === null ? (
    <MenuItem
      {...rest}
      sx={{
        ...style,
        display: 'inline-flex',
        flex: 1,
        width: '100%',
        borderTop: '1px solid',
        borderTopColor: 'divider',
      }}
      key={masterList.label}
    >
      <span style={{ whiteSpace: 'nowrap', flex: 1 }}>{masterList.label}</span>
      <CloseIcon sx={{ color: 'gray.dark' }} />
    </MenuItem>
  ) : (
    <MenuItem {...props} key={masterList.label}>
      <span style={{ whiteSpace: 'nowrap' }}>{getOptionLabel(masterList)}</span>
    </MenuItem>
  );
};

export const MasterListSearchInput = ({
  selectedMasterList,
  width,
  onChange,
  disabled,
  autoFocus = false,
  clearable = false,
  includeRemoveOption = !clearable,
  placeholder,
}: MasterListSearchInputProps) => {
  const t = useTranslation();
  const { store } = useAuthContext();
  const { data, isLoading } = useMasterLists({
    queryParams: {
      filterBy: {
        existsForStoreId: { equalTo: store?.id },
      },
    },
  });

  const masterLists = data?.nodes || [];
  const options: AutocompleteOption<MasterListOption>[] = masterLists.map(
    m => ({
      value: m.id,
      label: m.name,
      code: m.code,
    })
  );

  if (
    includeRemoveOption &&
    masterLists.length > 0 &&
    selectedMasterList !== null &&
    selectedMasterList !== undefined
  ) {
    options.push({ value: null, label: t('label.remove') });
  }

  const selectedOption = options.find(o => o.value === selectedMasterList?.id);

  return (
    <Autocomplete
      autoFocus={autoFocus}
      disabled={disabled}
      width={`${width}px`}
      popperMinWidth={Number(width)}
      clearable={clearable}
      value={selectedOption || null}
      loading={isLoading}
      onChange={(_, option) => {
        onChange(masterLists.find(l => l.id === option?.value) || null);
      }}
      options={options}
      noOptionsText={t('messages.no-master-lists')}
      renderOption={optionRenderer}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={(option, value) => option.value === value?.value}
      placeholder={placeholder}
    />
  );
};
