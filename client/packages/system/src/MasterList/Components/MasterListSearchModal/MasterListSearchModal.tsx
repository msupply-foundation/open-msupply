import React, { FC, useEffect } from 'react';
import {
  FilterBy,
  ListSearch,
  useTranslation,
} from '@openmsupply-client/common';
import { useMasterList, MasterListRowFragment } from '../../api';

interface MasterListSearchProps {
  filterBy?: FilterBy;
  open: boolean;
  onClose: () => void;
  onChange: (name: MasterListRowFragment) => void;
}

export const MasterListSearchModal: FC<MasterListSearchProps> = ({
  filterBy,
  open,
  onClose,
  onChange,
}) => {
  const sortBy = { key: 'name', direction: 'asc' as 'asc' | 'desc' };
  const { mutate, data, isLoading } = useMasterList.document.listAll(
    sortBy,
    filterBy
  );
  const t = useTranslation(['app', 'common']);

  // Only query for data once the modal has been opened
  useEffect(() => {
    if (open && !data && !isLoading) mutate();
  }, [open, data, isLoading]);

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
