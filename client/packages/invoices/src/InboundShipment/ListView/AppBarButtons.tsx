import React, { useEffect, useState } from 'react';
import { AppRoute } from '@openmsupply-client/config';
import {
  FnUtils,
  PlusCircleIcon,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  ToggleState,
  useNavigate,
  RouteBuilder,
  useAuthContext,
  useUrlQuery,
  useCallbackWithPermission,
  useNotification,
  usePreferences,
  UserPermission,
  SplitButtonOption,
  SplitButton,
} from '@openmsupply-client/common';

import { ExportSelector } from '@openmsupply-client/system';
import {
  NameRowFragment,
  SupplierSearchModal,
} from '@openmsupply-client/system';
import {
  InboundShipmentPurchaseOrderLineFragment,
  useInboundList,
  useInboundShipment,
} from '../api';
import { useListInternalOrders } from '../api/hooks/utils';
import { inboundsToCsv } from '../../utils';
import { LinkPurchaseOrderModal } from './LinkPurchaseOrderModal';
import { LinkInternalOrderModal } from './LinkInternalOrderModal';

export const AppBarButtons = ({
  internalModalController,
  externalModalController,
  linkRequestModalController,
  simplifiedTabletView,
}: {
  internalModalController: ToggleState;
  externalModalController: ToggleState;
  linkRequestModalController: ToggleState;
  simplifiedTabletView?: boolean;
}) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { store } = useAuthContext();
  const { error: errorNotification } = useNotification();
  const [name, setName] = useState<NameRowFragment | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null
  );

  const {
    create: { create: onCreate },
  } = useInboundShipment();
  const {
    query: { isFetching, refetch },
  } = useInboundList();
  const manuallyLinkInternalOrder =
    store?.preferences.manuallyLinkInternalOrderToInboundShipment;

  const { refetch: refetchInternalOrders } = useListInternalOrders(
    selectedSupplierId || ''
  );

  const createInvoice = async (
    nameId: string,
    requisitionId?: string,
    purchaseOrderId?: string,
    insertLinesFromPurchaseOrder?: boolean
  ) => {
    const isExternal = !!purchaseOrderId;
    try {
      const invoiceId = await onCreate({
        id: FnUtils.generateUUID(),
        otherPartyId: nameId,
        requisitionId,
        purchaseOrderId,
        insertLinesFromPurchaseOrder,
      });

      const route = isExternal
        ? AppRoute.InboundShipmentExternal
        : AppRoute.InboundShipment;
      navigate(
        RouteBuilder.create(AppRoute.Replenishment)
          .addPart(route)
          .addPart(invoiceId)
          .build()
      );
    } catch (e) {
      errorNotification(t('error.failed-to-create-inbound-shipment', { message: (e as Error).message }))();
    }
  };

  const handleSupplierSelected = async (
    row: NameRowFragment
  ): Promise<void> => {
    internalModalController.toggleOff();
    if (!manuallyLinkInternalOrder) {
      createInvoice(row.id);
      return;
    }

    setSelectedSupplierId(row.id);
    const { data } = await refetchInternalOrders();

    if (data?.totalCount === 0) {
      createInvoice(row.id);
    } else {
      setName(row);
      linkRequestModalController.toggleOn();
    }
  };

  const handlePurchaseOrderSelected = async (
    purchaseOrder: InboundShipmentPurchaseOrderLineFragment,
    addLinesFromPurchaseOrder: boolean
  ) => {
    externalModalController.toggleOff();

    createInvoice(
      purchaseOrder.supplier?.id as string,
      undefined,
      purchaseOrder.id,
      addLinesFromPurchaseOrder
    );
  };

  const getCsvData = async () => {
    const { data } = await refetch();
    return data?.nodes?.length ? inboundsToCsv(data.nodes, t) : null;
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <AddButton
          onNewShipment={internalModalController.toggleOn}
          onNewShipmentExternal={externalModalController.toggleOn}
        />
        {!simplifiedTabletView && (
          <ExportSelector
            getCsvData={getCsvData}
            filename={t('filename.inbounds')}
            isLoading={isFetching}
          />
        )}
      </Grid>
      <LinkInternalOrderModal
        isOpen={linkRequestModalController.isOn}
        onClose={linkRequestModalController.toggleOff}
        onRowClick={row => {
          createInvoice(name?.id ?? '', row.id);
          linkRequestModalController.toggleOff();
        }}
        onNextClick={() => {
          if (name) {
            createInvoice(name.id);
          }
        }}
        name={name}
      />
      <SupplierSearchModal
        open={internalModalController.isOn}
        onClose={internalModalController.toggleOff}
        onChange={handleSupplierSelected}
      />
      <LinkPurchaseOrderModal
        isOpen={externalModalController.isOn}
        onClose={externalModalController.toggleOff}
        handlePurchaseOrderSelected={handlePurchaseOrderSelected}
      />
    </AppBarButtonsPortal>
  );
};

export const AddButton = ({
  onNewShipment,
  onNewShipmentExternal,
}: {
  onNewShipment: () => void;
  onNewShipmentExternal: () => void;
}) => {
  const t = useTranslation();
  const currentTab = useUrlQuery().urlQuery['tab'];
  const { useProcurementFunctionality } = usePreferences();

  const handleNewShipment = useCallbackWithPermission(
    UserPermission.InboundShipmentMutate,
    onNewShipment
  );

  const handleNewShipmentExternal = useCallbackWithPermission(
    UserPermission.InboundShipmentExternalMutate,
    onNewShipmentExternal
  );

  const allOptions: SplitButtonOption<string>[] = [
    {
      value: 'new-shipment',
      label: t('button.new-shipment'),
    },
    ...(useProcurementFunctionality
      ? [
          {
            value: 'new-external-shipment',
            label: t('button.new-external-shipment'),
          },
        ]
      : []),
  ];

  const [selectedOption, setSelectedOption] = useState<
    SplitButtonOption<string>
  >(allOptions[0] ?? { value: '', label: '' });

  useEffect(() => {
    if (currentTab === t('label.external') && useProcurementFunctionality) {
      const externalOption = allOptions.find(
        o => o.value === 'new-external-shipment'
      );
      if (externalOption) setSelectedOption(externalOption);
    } else {
      const internalOption = allOptions.find(o => o.value === 'new-shipment');
      if (internalOption) setSelectedOption(internalOption);
    }
  }, [currentTab, useProcurementFunctionality]);

  const handleOptionSelection = (option: SplitButtonOption<string>) => {
    switch (option.value) {
      case 'new-shipment':
        handleNewShipment();
        break;
      case 'new-external-shipment':
        handleNewShipmentExternal();
        break;
    }
  };

  const onSelectOption = (option: SplitButtonOption<string>) => {
    setSelectedOption(option);
    handleOptionSelection(option);
  };

  if (allOptions.length === 1) {
    return (
      <ButtonWithIcon
        Icon={<PlusCircleIcon />}
        label={t('button.new-shipment')}
        onClick={handleNewShipment}
      />
    );
  }

  return (
    <>
      <SplitButton
        color="primary"
        options={allOptions}
        selectedOption={selectedOption}
        onSelectOption={onSelectOption}
        onClick={handleOptionSelection}
        openFrom="bottom"
        Icon={<PlusCircleIcon />}
      />
    </>
  );
};
