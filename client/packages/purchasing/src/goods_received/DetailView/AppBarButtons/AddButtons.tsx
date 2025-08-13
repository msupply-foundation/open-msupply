import React, { useEffect, useMemo, useState } from 'react';
import { SplitButton, SplitButtonOption } from '@common/components';
import { useTranslation } from '@common/intl';
import { PlusCircleIcon } from '@common/icons';
import {
  NonEmptyArray,
  useCallbackWithPermission,
  UserPermission,
  useToggle,
} from '@openmsupply-client/common/src';
import { GoodsReceivedFragment } from '../../api/operations.generated';
import { useGoodsReceivedLine } from '../../api';
import { createDraftGoodsReceivedLine } from '../LineEdit';
import { PurchaseOrderLineFragment } from 'packages/purchasing/src/purchase_order/api';
import { PurchaseOrderLineSearchModal } from 'packages/purchasing/src/purchase_order/Components/PurchaseOrderLineSearchModal';
import { ItemStockOnHandFragment } from 'packages/system/src';

interface AddButtonsProps {
  goodsReceived: GoodsReceivedFragment | undefined;
  /** Disable the whole control */
  disable: boolean;
}

export const AddButtons = ({ goodsReceived, disable }: AddButtonsProps) => {
  const t = useTranslation();
  const modalController = useToggle();

  const {
    create: { create },
  } = useGoodsReceivedLine();

  const openModal = useCallbackWithPermission(
    UserPermission.GoodsReceivedMutate,
    modalController.toggleOn
  );

  const handlePurchaseOrderSelected = async (
    selected: PurchaseOrderLineFragment
  ) => {
    try {
      if (!goodsReceived) return;
      const item = selected.item as ItemStockOnHandFragment;
      const draftLine = createDraftGoodsReceivedLine(
        item,
        goodsReceived?.id,
        selected.id
      );
      await create(draftLine);
    } catch (error) {
      console.error('Failed to create goods received:', error);
    }
    modalController.toggleOff();
  };

  const options: NonEmptyArray<SplitButtonOption<string>> = useMemo(
    () => [
      {
        value: 'add-item',
        label: t('button.add-item'),
        isDisabled: disable,
      },
      {
        value: 'add-all',
        label: t('button.add-all-from-purchase-order'),
        isDisabled: disable,
      },
    ],
    [disable, t]
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
        openModal();
        break;
      case 'add-all':
        alert('Not Implemented Yet');
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
        staticLabel={t('button.add')}
      />
      {modalController.isOn && (
        <PurchaseOrderLineSearchModal
          purchaseOrderId={goodsReceived?.purchaseOrderId ?? ''}
          open={modalController.isOn}
          onClose={modalController.toggleOff}
          onChange={handlePurchaseOrderSelected}
        />
      )}
    </>
  );
};
