import React, { FC } from 'react';
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
} from '@openmsupply-client/common';
import { SupplierSearchModal } from '@openmsupply-client/system';
import { useInbound } from '../api';
import { inboundsToCsv } from '../../utils';

export const AppBarButtons: FC<{
  modalController: ToggleState;
}> = ({ modalController }) => {
  const t = useTranslation('replenishment');
  const navigate = useNavigate();
  const { mutateAsync: onCreate } = useInbound.document.insert();
  const { success, error } = useNotification();
  const { isLoading, fetchAsync } = useInbound.document.listAll({
    key: 'createdDateTime',
    direction: 'desc',
    isDesc: true,
  });

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

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-shipment')}
          onClick={modalController.toggleOn}
        />
        <LoadingButton
          startIcon={<DownloadIcon />}
          variant="outlined"
          onClick={csvExport}
          isLoading={isLoading}
          disabled={EnvUtils.platform === Platform.Android}
        >
          {t('button.export', { ns: 'common' })}
        </LoadingButton>
      </Grid>
      <SupplierSearchModal
        open={modalController.isOn}
        onClose={modalController.toggleOff}
        onChange={async name => {
          modalController.toggleOff();
          await onCreate({
            id: FnUtils.generateUUID(),
            otherPartyId: name?.id,
          }).then(invoiceNumber => {
            navigate(
              RouteBuilder.create(AppRoute.Replenishment)
                .addPart(AppRoute.InboundShipment)
                .addPart(String(invoiceNumber))
                .build(),
              { replace: true }
            );
          });
        }}
      />
    </AppBarButtonsPortal>
  );
};
