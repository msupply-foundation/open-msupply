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
  FileUtils,
  SortBy,
  LoadingButton,
  ToggleState,
  Platform,
  EnvUtils,
} from '@openmsupply-client/common';
import { SupplierSearchModal } from '@openmsupply-client/system';
import { InboundRowFragment, useInbound } from '../api';
import { inboundsToCsv } from '../../utils';

export const AppBarButtons: FC<{
  modalController: ToggleState;
  sortBy: SortBy<InboundRowFragment>;
}> = ({ modalController, sortBy }) => {
  const { mutate: onCreate } = useInbound.document.insert();
  const { success, error } = useNotification();
  const t = useTranslation('replenishment');
  const { isLoading, fetchAsync } = useInbound.document.listAll(sortBy);

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
          onCreate({ id: FnUtils.generateUUID(), otherPartyId: name?.id });
        }}
      />
    </AppBarButtonsPortal>
  );
};
