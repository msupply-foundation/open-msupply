import React, { FC } from 'react';
import {
  FnUtils,
  DownloadIcon,
  PlusCircleIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  useToggle,
  FileUtils,
} from '@openmsupply-client/common';
import { SupplierSearchModal } from '@openmsupply-client/system';
import { useInbounds, useInsertInbound } from '../api';
import { inboundsToCsv } from '../../utils';

export const AppBarButtons: FC = () => {
  const modalController = useToggle();
  const { mutate: onCreate } = useInsertInbound();
  const { success, error } = useNotification();
  const t = useTranslation('replenishment');
  const { data } = useInbounds();

  const csvExport = () => {
    if (!data) {
      error(t('error.no-data'))();
      return;
    }

    const csv = inboundsToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, 'inbound-shipments');
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
        <ButtonWithIcon
          Icon={<DownloadIcon />}
          label={t('button.export', { ns: 'common' })}
          onClick={csvExport}
        />
      </Grid>
      <SupplierSearchModal
        open={modalController.isOn}
        onClose={modalController.toggleOff}
        onChange={async name => {
          modalController.toggleOff();
          onCreate({ id: FnUtils.generateUUID(), otherPartyId: name?.id });
        }}
      />
    </AppBarButtonsPortal>
  );
};
