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
} from '@openmsupply-client/common';
import { InternalSupplierSearchModal } from '@openmsupply-client/system';
import { RequestRowFragment, useInsertRequest, useRequestsAll } from '../api';
import { requestsToCsv } from '../../utils';

export const AppBarButtons: FC<{
  modalController: ToggleState;
  sortBy: SortBy<RequestRowFragment>;
}> = ({ modalController, sortBy }) => {
  const { mutate: onCreate } = useInsertRequest();
  const { success, error } = useNotification();
  const t = useTranslation('common');
  const { isLoading, mutateAsync } = useRequestsAll(sortBy);

  const csvExport = async () => {
    const data = await mutateAsync();
    if (!data || !data?.nodes.length) {
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
        <LoadingButton
          startIcon={<DownloadIcon />}
          variant="outlined"
          isLoading={isLoading}
          onClick={csvExport}
        >
          {t('button.export')}
        </LoadingButton>
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
