import React from 'react';
import {
  FilterBy,
  ListSearch,
  useTranslation,
} from '@openmsupply-client/common';
import { MasterListRowFragment, useMasterLists } from '../../api';

interface MasterListSearchProps {
  filterBy?: FilterBy;
  open: boolean;
  onClose: () => void;
  onChange: (name: MasterListRowFragment) => void;
  testId?: string;
}

export const MasterListSearchModal = ({
  filterBy,
  open,
  onClose,
  onChange,
  testId,
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
      testId={testId}
      getOptionTestId={masterList => `master-list-row-${masterList.id}`}
      onChange={(
        _,
        masterList: MasterListRowFragment | MasterListRowFragment[] | null
      ) => {
        if (masterList && !(masterList instanceof Array)) onChange(masterList);
      }}
    />
  );
};
