import React, { useState } from 'react';
import { AppRoute } from '@openmsupply-client/config';
import {
  FnUtils,
  DownloadIcon,
  PlusCircleIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  LoadingButton,
  ToggleState,
  useNavigate,
  RouteBuilder,
  useAuthContext,
  useExportCSV,
} from '@openmsupply-client/common';
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
  const { error } = useNotification();
  const { store } = useAuthContext();
  const [name, setName] = useState<NameRowFragment | null>(null);

  const exportCsv = useExportCSV();
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

  const csvExport = async () => {
    const data = await fetchAsync();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = inboundsToCsv(data.nodes, t);
    await exportCsv(csv, t('filename.inbounds'));
  };

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

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-shipment')}
          onClick={invoiceModalController.toggleOn}
        />
        {!simplifiedTabletView && (
          <LoadingButton
            startIcon={<DownloadIcon />}
            variant="outlined"
            onClick={csvExport}
            isLoading={isLoading}
            label={t('button.export')}
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
