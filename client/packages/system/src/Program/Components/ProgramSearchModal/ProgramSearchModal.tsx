import React, { FC } from 'react';
import {
  createQueryParamsStore,
  ListSearch,
  QueryParamsProvider,
  useTranslation,
} from '@openmsupply-client/common';
import { useProgram, ProgramDocumentRegistryFragment } from '../../api';
import { filterByName } from '../../utils';
import { getProgramOptionRenderer } from '../ProgramOptionRenderer';

interface ProgramSearchProps {
  disabledPrograms?: string[];
  open: boolean;
  onClose: () => void;
  onChange: (name: ProgramDocumentRegistryFragment) => void;
}

const ProgramSearchComponent: FC<ProgramSearchProps> = ({
  disabledPrograms = [],
  open,
  onClose,
  onChange,
}) => {
  const { data, isLoading } = useProgram.document.list();
  const t = useTranslation('app');
  const ProgramOptionRenderer = getProgramOptionRenderer();

  return (
    <ListSearch<ProgramDocumentRegistryFragment>
      loading={isLoading}
      open={open}
      options={data?.nodes ?? []}
      onClose={onClose}
      title={t('programs')}
      renderOption={ProgramOptionRenderer}
      getOptionLabel={(option: ProgramDocumentRegistryFragment) =>
        option.name ?? ''
      }
      filterOptions={filterByName}
      onChange={(
        _,
        name:
          | ProgramDocumentRegistryFragment
          | ProgramDocumentRegistryFragment[]
          | null
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
    createStore={() =>
      createQueryParamsStore<ProgramDocumentRegistryFragment>({
        initialSortBy: { key: 'documentType' },
      })
    }
  >
    <ProgramSearchComponent {...props} />
  </QueryParamsProvider>
);
