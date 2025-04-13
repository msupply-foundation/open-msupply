import React from 'react';
import {
  FilterByWithBoolean,
  ListSearch,
  useTranslation,
} from '@openmsupply-client/common';
import { MasterListRowFragment, useMasterLists } from '../../api';

interface MasterListSearchProps {
  filterBy?: FilterByWithBoolean;
  open: boolean;
  onClose: () => void;
  onChange: (name: MasterListRowFragment) => void;
}

export const MasterListSearchModal = ({
  filterBy,
  open,
  onClose,
  onChange,
}: MasterListSearchProps) => {
  const t = useTranslation();
  const { data, isLoading } = useMasterLists({
    queryParams: {
      filterBy,
    },
    enabled: open,
  });

  return (
    <ListSearch
      loading={isLoading}
      open={open}
      options={data?.nodes ?? []}
      onClose={onClose}
      title={t('master-lists')}
      optionKey="name"
      onChange={(
        _,
        masterList: MasterListRowFragment | MasterListRowFragment[] | null
      ) => {
        if (masterList && !(masterList instanceof Array)) onChange(masterList);
      }}
    />
  );
};
