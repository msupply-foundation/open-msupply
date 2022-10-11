import React from 'react';
import {
  ButtonWithIcon,
  useTranslation,
  useToggle,
  PlusCircleIcon,
  InvoiceNodeStatus,
  useAuthContext,
} from '@openmsupply-client/common';
import { MasterListSearchModal } from '@openmsupply-client/system';
import { useInbound } from '../api';

export const AddFromMasterListButtonComponent = () => {
  const t = useTranslation('distribution');
  const { addFromMasterList } = useInbound.utils.addFromMasterList();
  const { storeId } = useAuthContext();
  const { status } = useInbound.document.fields(['status']);
  const isDisabled = status !== InvoiceNodeStatus.New;
  const modalController = useToggle();
  const filterByStore = { existsForStoreId: { equalTo: storeId } };

  return (
    <>
      <MasterListSearchModal
        open={modalController.isOn}
        onClose={modalController.toggleOff}
        onChange={masterList => {
          modalController.toggleOff();
          addFromMasterList(masterList);
        }}
        filterBy={filterByStore}
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
