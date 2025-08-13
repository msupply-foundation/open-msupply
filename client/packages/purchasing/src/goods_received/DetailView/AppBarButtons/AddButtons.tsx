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
import { PurchaseOrderLineSearchModal } from 'packages/purchasing/src/purchase_order/Components/PurchaseOrderLineSearchModal';
import { useGoodsReceivedLine } from '../../api';
import { PurchaseOrderLineFragment } from 'packages/purchasing/src/purchase_order/api';

interface AddButtonsProps {
  goodsReceived: GoodsReceivedFragment | undefined;
  /** Disable the whole control */
  disable: boolean;
}

export const AddButtons = ({ goodsReceived, disable }: AddButtonsProps) => {
  const t = useTranslation();
  const modalController = useToggle();

  const {
    create: { create, isCreating },
    draft,
    updatePatch,
  } = useGoodsReceivedLine();

  const openModal = useCallbackWithPermission(
    UserPermission.GoodsReceivedMutate,
    modalController.toggleOn
  );

  const handlePurchaseOrderSelected = async (
    selected: PurchaseOrderLineFragment
  ) => {
    try {
      alert('Not Implemented Yet');
      draft.itemId = selected.item.id;
      draft.purchaseOrderLineId = selected.id;
      draft.goodsReceivedId = goodsReceived?.id ?? '';
      updatePatch(draft);
      const result = await create();
      console.log('Created goods received line:', result);
      // need to create the new line(s) based on selection

      // const result = await create(selected.id);
      // const goodsReceivedId = result?.insertGoodsReceived?.id;

      // if (goodsReceivedId) {
      //   const detailRoute = RouteBuilder.create(AppRoute.Replenishment)
      //     .addPart(AppRoute.GoodsReceived)
      //     .addPart(goodsReceivedId)
      //     .build();
      //   navigate(detailRoute);
      // }
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
        console.log('goods received', goodsReceived);
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
      <PurchaseOrderLineSearchModal
        purchaseOrderId={goodsReceived?.purchaseOrderId ?? ''}
        open={modalController.isOn}
        onClose={modalController.toggleOff}
        onChange={handlePurchaseOrderSelected}
      />
    </>
  );
};
