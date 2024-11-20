import React from 'react';
import {
  ButtonWithIcon,
  useTranslation,
  useToggle,
  PlusCircleIcon,
  useAuthContext,
} from '@openmsupply-client/common';
import { MasterListSearchModal } from '@openmsupply-client/system';
import { useRequest } from '../../api';

export const AddFromMasterListButtonComponent = () => {
  const t = useTranslation();
  const isDisabled = useRequest.utils.isDisabled();
  const isProgram = useRequest.utils.isProgram();
  const { addFromMasterList } = useRequest.utils.addFromMasterList();
  const modalController = useToggle();
  const { storeId } = useAuthContext();

  return (
    <>
      <MasterListSearchModal
        open={modalController.isOn}
        onClose={modalController.toggleOff}
        onChange={masterList => {
          modalController.toggleOff();
          addFromMasterList(masterList);
        }}
        filterBy={{ isProgram: false, existsForStoreId: { equalTo: storeId } }}
      />
      <ButtonWithIcon
        disabled={isDisabled || isProgram}
        Icon={<PlusCircleIcon />}
        label={t('button.add-from-master-list')}
        onClick={modalController.toggleOn}
      />
    </>
  );
};

export const AddFromMasterListButton = React.memo(
  AddFromMasterListButtonComponent
);
