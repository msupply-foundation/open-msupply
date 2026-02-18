import React, { useState } from 'react';
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
} from '@openmsupply-client/common';
import { ExportSelector } from '@openmsupply-client/system';
import {
  NameRowFragment,
  SupplierSearchModal,
} from '@openmsupply-client/system';
import { useInboundList, useInboundShipment } from '../api';
import { useListInternalOrders } from '../api/hooks/utils';
import { inboundsToCsv } from '../../utils';
import { LinkInternalOrderModal } from './LinkInternalOrderModal';

export const AppBarButtons = ({
  invoiceModalController,
  linkRequestModalController,
  simplifiedTabletView,
}: {
  invoiceModalController: ToggleState;
  linkRequestModalController: ToggleState;
  simplifiedTabletView?: boolean;
}) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { store } = useAuthContext();
  const [name, setName] = useState<NameRowFragment | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null
  );

  const {
    create: { create: onCreate },
  } = useInboundShipment();
  const {
    query: { isFetching, refetch },
  } = useInboundList({
    sortBy: { key: 'createdDateTime', direction: 'desc' },
    filterBy: null,
  });
  const manuallyLinkInternalOrder =
    store?.preferences.manuallyLinkInternalOrderToInboundShipment;

  const { refetch: refetchInternalOrders } = useListInternalOrders(
    selectedSupplierId || ''
  );

  const createInvoice = async (nameId: string, requisitionId?: string) => {
    const invoiceId = await onCreate({
      id: FnUtils.generateUUID(),
      otherPartyId: nameId,
      requisitionId,
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
    invoiceModalController.toggleOff();
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

  const getCsvData = async () => {
    const { data } = await refetch();
    return data?.nodes?.length ? inboundsToCsv(data.nodes, t) : null;
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-shipment')}
          onClick={invoiceModalController.toggleOn}
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
        open={invoiceModalController.isOn}
        onClose={invoiceModalController.toggleOff}
        onChange={handleSupplierSelected}
      />
    </AppBarButtonsPortal>
  );
};
