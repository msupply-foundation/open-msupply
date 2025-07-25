import React from 'react';
import { useTranslation, useAuthContext } from '@openmsupply-client/common';
import { MasterListSearchModal } from '@openmsupply-client/system';
import { usePurchaseOrder } from '../../api/hooks/usePurchaseOrder';

export const AddFromMasterListButtonComponent = ({
  isOn,
  toggleOff,
}: {
  isOn: boolean;
  toggleOff: () => void;
}) => {
  const t = useTranslation();
  const { storeId } = useAuthContext();

  const {
    query: { data: purchaseOrder },
    masterList: { addFromMasterList },
  } = usePurchaseOrder();

  return (
    <>
      <MasterListSearchModal
        open={isOn}
        onClose={toggleOff}
        onChange={masterList => {
          addFromMasterList(masterList.id, purchaseOrder?.id ?? '');
          toggleOff();
        }}
        filterBy={{ existsForStoreId: { equalTo: storeId } }}
      />
    </>
  );
};

export const AddFromMasterListButton = React.memo(
  AddFromMasterListButtonComponent
);
