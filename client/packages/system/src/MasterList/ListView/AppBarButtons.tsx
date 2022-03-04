import React, { FC } from 'react';
import { MasterListSearchModal } from '@openmsupply-client/system';
import {
  DownloadIcon,
  PrinterIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  useToggle,
} from '@openmsupply-client/common';

export const AppBarButtons: FC = () => {
  const { info, success } = useNotification();
  const t = useTranslation('inventory');
  const c = useToggle();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
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
        <ButtonWithIcon
          Icon={<PrinterIcon />}
          label={'Test master list modal'}
          onClick={() => c.toggleOn()}
        />
        <MasterListSearchModal
          open={c.isOn}
          onClose={c.toggleOff}
          onChange={n => console.log(n)}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
