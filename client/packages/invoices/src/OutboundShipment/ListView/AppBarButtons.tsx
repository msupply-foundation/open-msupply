import React, { FC } from 'react';
import { AppRoute } from '@openmsupply-client/config';
import {
  DownloadIcon,
  PlusCircleIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  FnUtils,
  FileUtils,
  LoadingButton,
  ToggleState,
  EnvUtils,
  Platform,
  RouteBuilder,
  useNavigate,
} from '@openmsupply-client/common';
import { CustomerSearchModal } from '@openmsupply-client/system';
import { useOutbound } from '../api';
import { outboundsToCsv } from '../../utils';

export const AppBarButtonsComponent: FC<{
  modalController: ToggleState;
}> = ({ modalController }) => {
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const { mutateAsync: onCreate } = useOutbound.document.insert();
  const t = useTranslation('distribution');
  const { fetchAsync, isLoading } = useOutbound.document.listAll({
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

    const csv = outboundsToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, t('filename.outbounds'));
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
        <CustomerSearchModal
          open={modalController.isOn}
          onClose={modalController.toggleOff}
          onChange={async name => {
            modalController.toggleOff();
            try {
              await onCreate({
                id: FnUtils.generateUUID(),
                otherPartyId: name?.id,
              }).then(invoiceNumber => {
                navigate(
                  RouteBuilder.create(AppRoute.Distribution)
                    .addPart(AppRoute.OutboundShipment)
                    .addPart(String(invoiceNumber))
                    .build(),
                  { replace: true }
                );
              });
            } catch (e) {
              const errorSnack = error(
                'Failed to create invoice! ' + (e as Error).message
              );
              errorSnack();
            }
          }}
        />
        <LoadingButton
          startIcon={<DownloadIcon />}
          isLoading={isLoading}
          variant="outlined"
          onClick={csvExport}
          disabled={EnvUtils.platform === Platform.Android}
        >
          {t('button.export')}
        </LoadingButton>
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
