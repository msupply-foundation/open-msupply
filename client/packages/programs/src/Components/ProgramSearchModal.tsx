import React, { FC } from 'react';
import {
  createQueryParamsStore,
  ListSearch,
  QueryParamsProvider,
  useTranslation,
  DefaultAutocompleteItemOption,
  AutocompleteOptionRenderer,
  Typography,
  Box,
  CheckIcon,
  FilterOptionsState,
  RegexUtils,
} from '@openmsupply-client/common';
import { DocumentRegistryFragment } from '../api/operations.generated';
import { useDocumentRegistry } from '../api';

const filterByName = (
  options: DocumentRegistryFragment[],
  state: FilterOptionsState<DocumentRegistryFragment>
) =>
  options.filter(option =>
    RegexUtils.matchObjectProperties(state.inputValue, option, ['name'])
  );

const getProgramOptionRenderer =
  (): AutocompleteOptionRenderer<DocumentRegistryFragment> =>
  (props, program) => {
    const name = program.name;
    return (
      <DefaultAutocompleteItemOption {...props} key={props.id}>
        <Box display="flex" alignItems="flex-end" gap={1} height={25}>
          <Box
            display="flex"
            flexDirection="row"
            justifyContent="center"
            gap={1}
            width={50}
          >
            <Box flex={0} style={{ height: 24, minWidth: 20 }}>
              {props['aria-disabled'] && <CheckIcon fontSize="small" />}
            </Box>
          </Box>
          <Typography>{name}</Typography>
        </Box>
      </DefaultAutocompleteItemOption>
    );
  };

interface ProgramSearchProps {
  disabledPrograms?: string[];
  open: boolean;
  onClose: () => void;
  onChange: (name: DocumentRegistryFragment) => void;
}

const ProgramSearchComponent: FC<ProgramSearchProps> = ({
  disabledPrograms = [],
  open,
  onClose,
  onChange,
}) => {
  const { data, isLoading } = useDocumentRegistry.get.programRegistries();
  const t = useTranslation();
  const ProgramOptionRenderer = getProgramOptionRenderer();

  return (
    <ListSearch<DocumentRegistryFragment>
      loading={isLoading}
      open={open}
      options={data?.nodes ?? []}
      onClose={onClose}
      title={t('programs')}
      renderOption={ProgramOptionRenderer}
      getOptionLabel={(option: DocumentRegistryFragment) => option.name ?? ''}
      filterOptions={filterByName}
      onChange={(
        _,
        name: DocumentRegistryFragment | DocumentRegistryFragment[] | null
      ) => {
        if (name && !(name instanceof Array)) onChange(name);
      }}
      getOptionDisabled={option =>
        disabledPrograms.includes(option.documentType ?? '')
      }
    />
  );
};

export const ProgramSearchModal: FC<ProgramSearchProps> = props => (
  <QueryParamsProvider
    createStore={createQueryParamsStore<DocumentRegistryFragment>({
      initialSortBy: { key: 'documentType' },
    })}
  >
    <ProgramSearchComponent {...props} />
  </QueryParamsProvider>
);
