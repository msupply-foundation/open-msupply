import React from 'react';
import {
  ButtonWithIcon,
  useTranslation,
  useToggle,
  PlusCircleIcon,
} from '@openmsupply-client/common';
import { MasterListSearchModal } from '@openmsupply-client/system';
import { useInbound } from '../api';

export const AddFromMasterListButtonComponent = () => {
  const t = useTranslation('distribution');
  const isDisabled = useInbound.utils.isDisabled();
  const { addFromMasterList } = useInbound.utils.addFromMasterList();
  const { otherPartyId } = useInbound.document.fields(['otherPartyId']);
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
