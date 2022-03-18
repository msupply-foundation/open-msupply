import React from 'react';
import {
  ButtonWithIcon,
  useTranslation,
  useToggle,
  PlusCircleIcon,
} from '@openmsupply-client/common';
import { MasterListSearchModal } from '@openmsupply-client/system';
import { useAddFromMasterList, useIsRequestDisabled } from '../../api';

export const AddFromMasterListButtonComponent = () => {
  const t = useTranslation('replenishment');
  const isDisabled = useIsRequestDisabled();
  const { addFromMasterList } = useAddFromMasterList();
  const modalController = useToggle();

  return (
    <>
      <MasterListSearchModal
        open={modalController.isOn}
        onClose={modalController.toggleOff}
        onChange={masterList => {
          modalController.toggleOff();
          addFromMasterList(masterList);
        }}
      />
      <ButtonWithIcon
        disabled={isDisabled}
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
