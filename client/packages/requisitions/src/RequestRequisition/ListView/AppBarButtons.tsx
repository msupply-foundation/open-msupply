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
import { InternalSupplierSearchModal } from '@openmsupply-client/system';
import { useInsertRequest, useRequests } from '../api';
import { requestsToCsv } from '../../utils';

export const AppBarButtons: FC = () => {
  const { mutate: onCreate } = useInsertRequest();
  const modalController = useToggle();
  const { success, error } = useNotification();
  const t = useTranslation('common');
  const { data } = useRequests();

  const csvExport = () => {
    if (!data) {
      error(t('error.no-data'))();
      return;
    }

    const csv = requestsToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, t('filename.requests'));
    success(t('success'))();
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('label.new-requisition')}
          onClick={modalController.toggleOn}
        />
        <ButtonWithIcon
          Icon={<DownloadIcon />}
          label={t('button.export')}
          onClick={csvExport}
        />
      </Grid>
      <InternalSupplierSearchModal
        open={modalController.isOn}
        onClose={modalController.toggleOff}
        onChange={async name => {
          modalController.toggleOff();
          onCreate({
            id: FnUtils.generateUUID(),
            otherPartyId: name?.id,
          });
        }}
      />
    </AppBarButtonsPortal>
  );
};
