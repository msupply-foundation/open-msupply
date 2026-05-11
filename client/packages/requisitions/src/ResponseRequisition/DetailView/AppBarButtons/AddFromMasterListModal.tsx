import React from 'react';
import { useAuthContext } from '@openmsupply-client/common';
import { MasterListSearchModal } from '@openmsupply-client/system';
import { useResponse } from '../../api';

export const AddFromMasterListModalComponent = ({
  isOn,
  toggleOff,
}: {
  isOn: boolean;
  toggleOff: () => void;
}) => {
  const { storeId } = useAuthContext();
  const { responseAddFromMasterList } = useResponse.utils.addFromMasterList();
  const filter = { isProgram: false, existsForStoreId: { equalTo: storeId } };

  return (
    <MasterListSearchModal
      open={isOn}
      onClose={toggleOff}
      onChange={masterList => {
        toggleOff();
        responseAddFromMasterList(masterList);
      }}
      filterBy={filter}
    />
  );
};

export const AddFromMasterListModal = React.memo(
  AddFromMasterListModalComponent
);
