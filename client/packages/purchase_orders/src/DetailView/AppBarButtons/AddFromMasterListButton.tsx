import React from 'react';
import {
  ButtonWithIcon,
  useTranslation,
  useToggle,
  PlusCircleIcon,
  useAuthContext,
} from '@openmsupply-client/common';
import { MasterListSearchModal } from '@openmsupply-client/system';

export const AddFromMasterListButtonComponent = () => {
  const t = useTranslation();

  const modalController = useToggle();
  const { storeId } = useAuthContext();

  return (
    
      <MasterListSearchModal
        open={modalController.isOn}
        onClose={modalController.toggleOff}
        onChange={masterList => {
          modalController.toggleOff();
          // eslint-disable-next-line no-console
          console.log('TO-DO: Add from master list', masterList);
          // addFromMasterList(masterList);
        }}
        filterBy={{ isProgram: false, existsForStoreId: { equalTo: storeId } }}
      />
      <ButtonWithIcon
        // disabled={isDisabled || isProgram}
        Icon={<PlusCircleIcon />}
        label={t('button.add-from-master-list')}
        onClick={modalController.toggleOn}
      />
    
  );
};

export const AddFromMasterListButton = React.memo(
  AddFromMasterListButtonComponent
);
