import React, { useEffect, useMemo, useState } from 'react';
import { SplitButton, SplitButtonOption } from '@common/components';
import { useTranslation } from '@common/intl';
import { AddFromMasterListButton } from './AddFromMasterListButton';
import { useToggle } from '@common/hooks';
import { PlusCircleIcon } from '@common/icons';
import { PurchaseOrderFragment } from '../../api';
import { UserPermission } from '@common/types';
import { LineImportModal } from '../ImportLines/LineImportModal';
import {
  NonEmptyArray,
  useCallbackWithPermission,
} from '@openmsupply-client/common';

interface AddButtonProps {
  purchaseOrder: PurchaseOrderFragment | undefined;
  onAddItem: () => void;
  /** Disable the whole control */
  disable: boolean;
  disableAddFromMasterListButton: boolean;
}

export const AddButton = ({
  onAddItem,
  disable,
  disableAddFromMasterListButton,
}: AddButtonProps) => {
  const t = useTranslation();

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
        isDisabled: disableAddFromMasterListButton,
      },
      {
        value: 'import-from-csv',
        label: t('button.upload-purchase-order-lines'),
        isDisabled: disable,
      },
    ],
    [disable, disableAddFromMasterListButton, t]
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
        masterListModalController.toggleOn();
        break;
      case 'import-from-csv':
        handleUploadPurchaseOrderLines();
        break;
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
      />

      {masterListModalController.isOn && (
        <AddFromMasterListButton
          isOn={masterListModalController.isOn}
          toggleOff={masterListModalController.toggleOff}
        />
      )}
      {importModalController.isOn && (
        <LineImportModal
          isOpen={importModalController.isOn}
          onClose={importModalController.toggleOff}
        />
      )}
    </>
  );
};
