import React, { useEffect, useMemo, useState } from 'react';
import { SplitButton, SplitButtonOption } from '@common/components';
import { useTranslation } from '@common/intl';
import { AddFromMasterListButton } from './AddFromMasterListButton';
import { useToggle } from '@common/hooks';
import { PlusCircleIcon } from '@common/icons';
import { PurchaseOrderFragment } from '../../api';
import { UserPermission } from '@common/types';
import { AddDocumentModal } from './AddDocumentModal';
import { PurchaseOrderLineImportModal } from '../ImportLines/PurchaseOrderLineImportModal';
import {
  NonEmptyArray,
  useCallbackWithPermission,
} from '@openmsupply-client/common/src';

interface AddButtonProps {
  purchaseOrder: PurchaseOrderFragment | undefined;
  onAddItem: () => void;
  /** Disable the whole control */
  disable: boolean;
  disableAddFromMasterListButton: boolean;
}

export const AddButton = ({
  purchaseOrder,
  onAddItem,
  disable,
  disableAddFromMasterListButton,
}: AddButtonProps) => {
  const t = useTranslation();
  const masterListModalController = useToggle();
  const uploadDocumentController = useToggle();
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
      {
        value: 'upload-document',
        label: t('label.upload-document'),
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
      case 'upload-document':
        uploadDocumentController.toggleOn();
        break;
      case 'upload-document':
        uploadDocumentController.toggleOn();
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
      {uploadDocumentController.isOn && (
        <AddDocumentModal
          isOn={uploadDocumentController.isOn}
          toggleOff={uploadDocumentController.toggleOff}
          purchaseOrderId={purchaseOrder?.id}
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
