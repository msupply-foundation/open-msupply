import React from 'react';
import {
  ButtonWithIcon,
  useTranslation,
  useToggle,
  PlusCircleIcon,
} from '@openmsupply-client/common';
import { MasterListSearchModal } from '@openmsupply-client/system';
import { useOutbound } from '../api';

export const AddFromMasterListButtonComponent = () => {
  const t = useTranslation('distribution');
  const isDisabled = useOutbound.utils.isDisabled();
  const { addFromMasterList } = useOutbound.utils.addFromMasterList();
  const { otherPartyId, otherPartyStore } = useOutbound.document.fields([
    'otherPartyId',
    'otherPartyStore',
  ]);
  const modalController = useToggle();
  const filterByName = { existsForNameId: { equalTo: otherPartyId } };

  return (
    <>
      <MasterListSearchModal
        open={modalController.isOn}
        onClose={modalController.toggleOff}
        onChange={masterList => {
          modalController.toggleOff();
          addFromMasterList(masterList);
        }}
        filterBy={filterByName}
        storeId={otherPartyStore?.id}
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
