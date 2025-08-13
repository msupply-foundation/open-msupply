import React, { useEffect, useMemo, useState } from 'react';
import {
  NonEmptyArray,
  useCallbackWithPermission,
  useNotification,
  UserPermission,
  useToggle,
  useTranslation,
  PlusCircleIcon,
  SplitButton,
  SplitButtonOption,
} from '@openmsupply-client/common/src';
import { ItemStockOnHandFragment } from '@openmsupply-client/system';
import { PurchaseOrderLineSearchModal } from '../../../purchase_order/Components';
import { PurchaseOrderLineFragment } from '../../../purchase_order/api';
import { GoodsReceivedFragment } from '../../api/operations.generated';
import { useGoodsReceivedLine } from '../../api';
import { createDraftGoodsReceivedLine } from '../LineEdit';

interface AddButtonsProps {
  goodsReceived?: GoodsReceivedFragment;
  disable: boolean;
}

export const AddButtons = ({ goodsReceived, disable }: AddButtonsProps) => {
  const t = useTranslation();
  const { error } = useNotification();
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
    } catch (e) {
      error(
        t('error.failed-to-add-goods-received-line', {
          message: e instanceof Error ? e.message : 'unknown error',
        })
      )();
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
