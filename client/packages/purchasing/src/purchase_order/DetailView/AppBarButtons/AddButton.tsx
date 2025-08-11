import React, { useEffect, useMemo, useState } from 'react';
import { SplitButton, SplitButtonOption } from '@common/components';
import { useTranslation } from '@common/intl';
import { AddFromMasterListButton } from './AddFromMasterListButton';
import { useNotification, useToggle } from '@common/hooks';
import { PlusCircleIcon } from '@common/icons';
import { PurchaseOrderFragment } from '../../api';
import { PurchaseOrderNodeStatus, UserPermission } from '@common/types';
import { PurchaseOrderLineImportModal } from '../ImportLines/PurchaseOrderLineImportModal';
import {
  NonEmptyArray,
  useCallbackWithPermission,
} from '@openmsupply-client/common/src';
import { isPurchaseOrderEditable } from '@openmsupply-client/purchasing/src/utils';

interface AddButtonProps {
  purchaseOrder: PurchaseOrderFragment | undefined;
  onAddItem: () => void;
  /** Disable the whole control */
  disable: boolean;
}

export const AddButton = ({
  purchaseOrder,
  onAddItem,
  disable,
}: AddButtonProps) => {
  const t = useTranslation();
  const { info } = useNotification();
  const masterListModalController = useToggle();
  const importModalController = useToggle();

  const handleUploadPurchaseOrderLines = useCallbackWithPermission(
    UserPermission.PurchaseOrderMutate,
    importModalController.toggleOn,
    t('error.no-purchase-order-import-permission')
  );

  const options: NonEmptyArray<SplitButtonOption<string>> = useMemo(
    () => [
      {
        value: 'add-item',
        label: t('button.add-item'),
        isDisabled: disable,
      },
      {
        value: 'add-from-master-list',
        label: t('button.add-from-master-list'),
        isDisabled: disable,
      },
      {
        value: 'import-from-csv',
        label: t('button.upload-purchase-order-lines'),
        isDisabled: disable,
      },
    ],
    [disable]
  );

  const [selectedOption, setSelectedOption] = useState<
    SplitButtonOption<string>
  >(options[0]);

  useEffect(() => {
    setSelectedOption(options[0]);
  }, [options]);

  const handleOptionSelection = (option: SplitButtonOption<string>) => {
    switch (option.value) {
      case 'add-item':
        onAddItem();
        break;
      case 'add-from-master-list':
        isPurchaseOrderEditable(
          purchaseOrder?.status ?? PurchaseOrderNodeStatus.New
        )
          ? masterListModalController.toggleOn()
          : info(t('error.cannot-add-from-masterlist'))();
        break;
      case 'import-from-csv':
        isPurchaseOrderEditable(
          purchaseOrder?.status ?? PurchaseOrderNodeStatus.New
        )
          ? handleUploadPurchaseOrderLines()
          : info(t('error.cannot-import'))();
    }
  };

  const onSelectOption = (option: SplitButtonOption<string>) => {
    setSelectedOption(option);
    handleOptionSelection(option);
  };

  return (
    <>
      <SplitButton
        color="primary"
        options={options}
        selectedOption={selectedOption}
        onSelectOption={onSelectOption}
        onClick={handleOptionSelection}
        isDisabled={disable}
        openFrom="bottom"
        Icon={<PlusCircleIcon />}
        staticLabel={t('button.add')}
      />

      {masterListModalController.isOn && (
        <AddFromMasterListButton
          isOn={masterListModalController.isOn}
          toggleOff={masterListModalController.toggleOff}
        />
      )}
      {importModalController.isOn && (
        <PurchaseOrderLineImportModal
          isOpen={importModalController.isOn}
          onClose={importModalController.toggleOff}
        />
      )}
    </>
  );
};
