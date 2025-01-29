import React, { useEffect, useState } from 'react';
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
  FileUtils,
  LoadingButton,
  ToggleState,
  Platform,
  EnvUtils,
  useNavigate,
  RouteBuilder,
  useAuthContext,
} from '@openmsupply-client/common';
import {
  NameRowFragment,
  SupplierSearchModal,
} from '@openmsupply-client/system';
import { LinkedRequestRowFragment, useInbound } from '../api';
import { inboundsToCsv } from '../../utils';
import { LinkInternalOrderModal } from './LinkInternalOrderModal';

export const AppBarButtons = ({
  invoiceModalController,
  linkRequestModalController,
}: {
  invoiceModalController: ToggleState;
  linkRequestModalController: ToggleState;
}) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const { store } = useAuthContext();
  const [name, setName] = useState<NameRowFragment | null>(null);
  const { mutateAsync: onCreate } = useInbound.document.insert();
  const { isLoading, fetchAsync } = useInbound.document.listAll({
    key: 'createdDateTime',
    direction: 'desc',
    isDesc: true,
  });
  const { data, isLoading: internalOrderIsLoading } =
    useInbound.document.listInternalOrders(name?.id ?? '');
  const manuallyLinkInternalOrder =
    store?.preferences.manuallyLinkInternalOrderToInboundShipment;

  const csvExport = async () => {
    const data = await fetchAsync();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = inboundsToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, t('filename.inbounds'));
    success(t('success'))();
  };

  const createInvoice = async (nameId: string) => {
    const invoiceNumber = await onCreate({
      id: FnUtils.generateUUID(),
      otherPartyId: nameId,
    });

    navigate(
      RouteBuilder.create(AppRoute.Replenishment)
        .addPart(AppRoute.InboundShipment)
        .addPart(String(invoiceNumber))
        .build()
    );
  };
  useEffect(() => {
    if (name && (data?.totalCount === 0 || !manuallyLinkInternalOrder)) {
      createInvoice(name.id);
    }
  }, [name, data]);

  const onRowClick = async (row: LinkedRequestRowFragment) => {
    const invoiceNumber = await onCreate({
      id: FnUtils.generateUUID(),
      otherPartyId: name?.id ?? '',
      requisitionId: row.id,
    });

    navigate(
      RouteBuilder.create(AppRoute.Replenishment)
        .addPart(AppRoute.InboundShipment)
        .addPart(String(invoiceNumber))
        .build()
    );
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-shipment')}
          onClick={invoiceModalController.toggleOn}
        />
        <LoadingButton
          startIcon={<DownloadIcon />}
          variant="outlined"
          onClick={csvExport}
          isLoading={isLoading}
          disabled={EnvUtils.platform === Platform.Android}
          label={t('button.export')}
        />
      </Grid>

      {data?.totalCount !== 0 && manuallyLinkInternalOrder && (
        <LinkInternalOrderModal
          requestRequisitions={data?.nodes}
          isOpen={linkRequestModalController.isOn}
          onClose={linkRequestModalController.toggleOff}
          onRowClick={onRowClick}
          isLoading={internalOrderIsLoading}
          onNextClick={() => {
            if (name) {
              createInvoice(name.id);
            }
          }}
        />
      )}
      <SupplierSearchModal
        open={invoiceModalController.isOn}
        onClose={invoiceModalController.toggleOff}
        onChange={nameRow => {
          setName(nameRow);
          invoiceModalController.toggleOff();
          if (manuallyLinkInternalOrder) {
            linkRequestModalController.toggleOn();
          }
        }}
      />
    </AppBarButtonsPortal>
  );
};
