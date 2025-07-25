import React from 'react';
import {
  ButtonWithIcon,
  useTranslation,
  useToggle,
  PlusCircleIcon,
  useAuthContext,
} from '@openmsupply-client/common';
import { MasterListSearchModal } from '@openmsupply-client/system';

export const AddFromMasterListButtonComponent = ({
  isOn,
  toggleOff,
}: {
  isOn: boolean;
  toggleOff: () => void;
}) => {
  const t = useTranslation();
  const { storeId } = useAuthContext();

  return (
    <>
      <MasterListSearchModal
        open={isOn}
        onClose={toggleOff}
        onChange={masterList => {
          toggleOff();
          // eslint-disable-next-line no-console
          console.log('TO-DO: Add from master list', masterList);
          // addFromMasterList(masterList);
        }}
        filterBy={{ existsForStoreId: { equalTo: storeId } }}
      />
    </>
  );
};

export const AddFromMasterListButton = React.memo(
  AddFromMasterListButtonComponent
);
