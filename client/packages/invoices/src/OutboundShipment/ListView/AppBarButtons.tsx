import React, { FC } from 'react';
import {
  DownloadIcon,
  PlusCircleIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  useToggle,
  FnUtils,
  FileUtils,
} from '@openmsupply-client/common';
import { CustomerSearchModal } from '@openmsupply-client/system';
import { useOutbound } from '../api';
import { outboundsToCsv } from '../../utils';

export const AppBarButtonsComponent: FC = () => {
  const { success, error } = useNotification();
  const { mutate: onCreate } = useOutbound.document.insert();
  const t = useTranslation(['distribution', 'common']);
  const modalController = useToggle();
  const { data } = useOutbound.document.list();

  const csvExport = () => {
    if (!data) {
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
              });
            } catch (e) {
              const errorSnack = error(
                'Failed to create invoice! ' + (e as Error).message
              );
              errorSnack();
            }
          }}
        />
        <ButtonWithIcon
          Icon={<DownloadIcon />}
          label={t('button.export')}
          onClick={csvExport}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
