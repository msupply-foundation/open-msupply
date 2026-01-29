import React, { useEffect, useState } from 'react';
import { AppRoute } from '@openmsupply-client/config';
import {
  FnUtils,
  PlusCircleIcon,
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  ToggleState,
  useNavigate,
  RouteBuilder,
  useAuthContext,
  useUrlQuery,
  SplitButtonOption,
  SplitButton,
} from '@openmsupply-client/common';
import { ExportSelector } from '@openmsupply-client/system';
import {
  NameRowFragment,
  SupplierSearchModal,
} from '@openmsupply-client/system';
import { InboundShipmentPurchaseOrderLineFragment, useInbound } from '../api';
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
  const [name, setName] = useState<NameRowFragment | null>(null);

  const { mutateAsync: onCreate } = useInbound.document.insert();
  const { isLoading, fetchAsync } = useInbound.document.listAll({
    key: 'createdDateTime',
    direction: 'desc',
    isDesc: true,
  });
  const { mutateAsync: fetchInternalOrders } =
    useInbound.document.listInternalOrdersPromise();
  const manuallyLinkInternalOrder =
    store?.preferences.manuallyLinkInternalOrderToInboundShipment;

  const createInvoice = async (nameId: string, requisitionId?: string, purchaseOrderId?: string, insertLinesFromPurchaseOrder?: boolean) => {
    const invoiceId = await onCreate({
      id: FnUtils.generateUUID(),
      otherPartyId: nameId,
      requisitionId,
      purchaseOrderId,
      insertLinesFromPurchaseOrder,
    });

    navigate(
      RouteBuilder.create(AppRoute.Replenishment)
        .addPart(AppRoute.InboundShipment)
        .addPart(invoiceId)
        .build()
    );
  };

  const handleSupplierSelected = async (
    row: NameRowFragment
  ): Promise<void> => {
    internalModalController.toggleOff();
    if (!manuallyLinkInternalOrder) {
      createInvoice(row.id);
      return;
    }

    const data = await fetchInternalOrders(row.id);

    if (data?.internalOrders.totalCount === 0) {
      createInvoice(row.id);
    } else {
      setName(row);
      linkRequestModalController.toggleOn();
    }
  };

  const handlePurchaseOrderSelected = async (purchaseOrder: InboundShipmentPurchaseOrderLineFragment, addLinesFromPurchaseOrder: boolean) => {
    externalModalController.toggleOff();

    createInvoice(purchaseOrder.supplier?.id as string, undefined, purchaseOrder.id, addLinesFromPurchaseOrder);
  }

  const getCsvData = async () => {
    const data = await fetchAsync();
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
            isLoading={isLoading}
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
  onNewShipment: () => void,
  onNewShipmentExternal: () => void,
}) => {
  const t = useTranslation();
  const currentTab = useUrlQuery().urlQuery['tab'];

  const options: [SplitButtonOption<string>, SplitButtonOption<string>] = [
    {
      value: 'new-shipment',
      label: t('button.new-shipment'),
    },
    {
      value: 'new-external-shipment',
      label: t('button.new-external-shipment'),
    },
  ];

  const [selectedOption, setSelectedOption] = useState<
    SplitButtonOption<string>
  >(options[0]);

  useEffect(() => {
    if (currentTab === t('label.external')) {
      setSelectedOption(options[1]);
    } else {
      setSelectedOption(options[0]);
    }
  }, [currentTab]);

  const handleOptionSelection = (option: SplitButtonOption<string>) => {
    switch (option.value) {
      case 'new-shipment':
        onNewShipment();
        break;
      case 'new-external-shipment':
        onNewShipmentExternal();
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
        openFrom="bottom"
        Icon={<PlusCircleIcon />}
      />
    </>
  );
};
