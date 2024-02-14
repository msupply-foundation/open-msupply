import React from 'react';
import {
  ButtonWithIcon,
  useTranslation,
  useToggle,
  PlusCircleIcon,
  InvoiceNodeStatus,
} from '@openmsupply-client/common';
import { MasterListSearchModal } from '@openmsupply-client/system';
import { useReturn } from '../api';

export const AddFromMasterListButtonComponent = () => {
  const t = useTranslation('distribution');
  const { status } = useReturn.document.fields(['status']);
  const isDisabled = status !== InvoiceNodeStatus.New;
  const { addFromMasterList } = useReturn.utils.addFromMasterList();
  const { otherPartyId } = useReturn.document.fields(['otherPartyId']);
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
