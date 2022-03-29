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
} from '@openmsupply-client/common';
import { InternalSupplierSearchModal } from '@openmsupply-client/system';
import { useInsertRequest } from '../api';

export const AppBarButtons: FC = () => {
  const { mutate: onCreate } = useInsertRequest();
  const modalController = useToggle();
  const { success } = useNotification();
  const t = useTranslation('common');

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
          onClick={success('Downloaded successfully')}
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
