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
import { useInbound } from '../api';
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

    const data = await fetchInternalOrders(row.id);

    if (data?.internalOrders.totalCount === 0) {
      createInvoice(row.id);
    } else {
      setName(row);
      linkRequestModalController.toggleOn();
    }
  };

  const getCsvData = async () => {
    const data = await fetchAsync();
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
        open={invoiceModalController.isOn}
        onClose={invoiceModalController.toggleOff}
        onChange={handleSupplierSelected}
      />
    </AppBarButtonsPortal>
  );
};
