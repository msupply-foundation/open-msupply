import React from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  DownloadIcon,
  useTranslation,
} from '@openmsupply-client/common';

export const AppBarButtons: React.FC = () => {
  const t = useTranslation();
  // Placeholder for actions
  const handleExport = () => {
    // eslint-disable-next-line
    console.log('TO-DO: Export goods received...');
  };
  return (
    <AppBarButtonsPortal>
      <ButtonWithIcon
        Icon={<DownloadIcon />}
        label={t('button.export')}
        onClick={handleExport}
      />
    </AppBarButtonsPortal>
  );
};
