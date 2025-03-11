import React from 'react';
import { useAuthContext } from '@openmsupply-client/common';
import { MasterListSearchModal } from '@openmsupply-client/system';
import { useInbound } from '../api';

export const AddFromMasterListButtonComponent = ({
  isOn,
  toggleOff,
}: {
  isOn: boolean;
  toggleOff: () => void;
}) => {
  const { addFromMasterList } = useInbound.utils.addFromMasterList();
  const { storeId } = useAuthContext();
  const filterByStore = { existsForStoreId: { equalTo: storeId } };

  return (
    <>
      <MasterListSearchModal
        open={isOn}
        onClose={toggleOff}
        onChange={masterList => {
          toggleOff();
          addFromMasterList(masterList);
        }}
        filterBy={filterByStore}
      />
    </>
  );
};

export const AddFromMasterListButton = React.memo(
  AddFromMasterListButtonComponent
);
