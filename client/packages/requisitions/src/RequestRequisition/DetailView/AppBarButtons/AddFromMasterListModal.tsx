import React from 'react';
import { useAuthContext } from '@openmsupply-client/common';
import { MasterListSearchModal } from '@openmsupply-client/system';
import { useRequest } from '../../api';

export const AddFromMasterListModalComponent = ({
  isOn,
  toggleOff,
}: {
  isOn: boolean;
  toggleOff: () => void;
}) => {
  const { addFromMasterList } = useRequest.utils.addFromMasterList();
  const { storeId } = useAuthContext();
  const filter = { isProgram: false, existsForStoreId: { equalTo: storeId } };

  return (
    <MasterListSearchModal
      open={isOn}
      onClose={toggleOff}
      onChange={masterList => {
        toggleOff();
        addFromMasterList(masterList);
      }}
      filterBy={filter}
    />
  );
};

export const AddFromMasterListModal = React.memo(
  AddFromMasterListModalComponent
);
