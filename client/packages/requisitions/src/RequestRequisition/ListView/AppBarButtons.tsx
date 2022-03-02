import React, { FC } from 'react';

import {
  generateUUID,
  DownloadIcon,
  PlusCircleIcon,
  PrinterIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  useToggle,
} from '@openmsupply-client/common';
import { NameSearchModal } from '@openmsupply-client/system';
import { useCreateRequestRequisition } from '../api';

export const AppBarButtons: FC = () => {
  const { mutate: onCreate } = useCreateRequestRequisition();
  const modalController = useToggle();
  const { info, success } = useNotification();
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
        <ButtonWithIcon
          Icon={<PrinterIcon />}
          label={t('button.print')}
          onClick={info('No printer detected')}
        />
      </Grid>
      <NameSearchModal
        type="supplier"
        open={modalController.isOn}
        onClose={modalController.toggleOff}
        onChange={async name => {
          modalController.toggleOff();
          onCreate({
            id: generateUUID(),
            otherPartyId: name?.id,
          });
        }}
      />
    </AppBarButtonsPortal>
  );
};
