import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  ButtonWithIcon,
  ToggleState,
  UploadIcon,
  useTranslation,
  NamePropertyNode,
  useNotification,
} from '@openmsupply-client/common';

export const AppBarButtonsComponent = ({
  importModalController,
  properties,
  propertiesLoading,
}: {
  importModalController: ToggleState;
  properties: NamePropertyNode[] | undefined;
  propertiesLoading: boolean;
}) => {
  const t = useTranslation();
  const { error } = useNotification();

  const handleClick = () => {
    properties?.length && properties.length >= 0
      ? importModalController.toggleOn()
      : error(t('error.no-properties-to-import'))();
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          disabled={propertiesLoading}
          Icon={<UploadIcon />}
          label={t('button.import-properties')}
          onClick={handleClick}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
