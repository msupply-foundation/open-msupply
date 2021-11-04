import React, { FC } from 'react';

import {
  DownloadIcon,
  PlusCircleIcon,
  PrinterIcon,
  useNotification,
  AppBarButtonsPortal,
  BookIcon,
  ButtonWithIcon,
  Grid,
} from '@openmsupply-client/common';

import { ExternalURL } from '@openmsupply-client/config';

interface AppBarButtonsProps {
  onCreate: (toggle: boolean) => void;
}

export const AppBarButtons: FC<AppBarButtonsProps> = ({ onCreate }) => {
  const { info, success } = useNotification();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          labelKey="button.new-shipment"
          onClick={() => onCreate(true)}
        />
        <ButtonWithIcon
          Icon={<DownloadIcon />}
          labelKey="button.export"
          onClick={success('Downloaded successfully')}
        />
        <ButtonWithIcon
          Icon={<PrinterIcon />}
          labelKey="button.print"
          onClick={info('No printer detected')}
        />
        <ButtonWithIcon
          Icon={<BookIcon />}
          labelKey="button.docs"
          onClick={() => (location.href = ExternalURL.PublicDocs)}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
