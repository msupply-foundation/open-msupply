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
  SortBy,
  LoadingButton,
} from '@openmsupply-client/common';
import { SupplierSearchModal } from '@openmsupply-client/system';
import { InboundRowFragment, useInboundsAll, useInsertInbound } from '../api';
import { inboundsToCsv } from '../../utils';

export const AppBarButtons: FC<{
  sortBy: SortBy<InboundRowFragment>;
}> = ({ sortBy }) => {
  const modalController = useToggle();
  const { mutate: onCreate } = useInsertInbound();
  const { success, error } = useNotification();
  const t = useTranslation('replenishment');
  const { isLoading, mutateAsync } = useInboundsAll(sortBy);

  const csvExport = async () => {
    const data = await mutateAsync();
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
        >
          {t('button.export', { ns: 'common' })}
        </LoadingButton>
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
