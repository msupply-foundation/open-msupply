import React, { FC } from 'react';
import { ListSearch, useTranslation } from '@openmsupply-client/common';
import { useMasterList, MasterListRowFragment } from '../../api';

interface MasterListSearchProps {
  open: boolean;
  onClose: () => void;
  onChange: (name: MasterListRowFragment) => void;
}

export const MasterListSearchModal: FC<MasterListSearchProps> = ({
  open,
  onClose,
  onChange,
}) => {
  // Only query for data once the modal has been opened at least once
  const { data, isLoading } = useMasterList.document.list({ enabled: open });
  const t = useTranslation(['app', 'common']);

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
