import React from 'react';
import {
  useNotification,
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  ButtonWithIcon,
  UploadIcon,
  ToggleState,
  useIsCentralServerApi,
  RouteBuilder,
  useNavigate,
  BaseButton,
  EditIcon,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ExportSelector } from '@openmsupply-client/system';
import { AssetCatalogueItemFragment } from '../api';
import { assetCatalogueItemsListToCsv } from '../utils';

export const AppBarButtonsComponent = ({
  importModalController,
  assets,
}: {
  importModalController: ToggleState;
  assets: AssetCatalogueItemFragment[];
}) => {
  const t = useTranslation();
  const isCentralServer = useIsCentralServerApi();
  const { error } = useNotification();
  const navigate = useNavigate();

  const path = RouteBuilder.create(AppRoute.Catalogue)
    .addPart(AppRoute.Assets)
    .addPart(AppRoute.LogReasons)
    .build();

  const getCsvData = async () => {
    if (!assets?.length) {
      error(t('error.no-data'))();
      return null;
    }
    return assetCatalogueItemsListToCsv(assets, t);
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        {isCentralServer && (
          <ButtonWithIcon
            Icon={<UploadIcon />}
            label={t('button.import')}
            onClick={importModalController.toggleOn}
          />
        )}
        <ExportSelector
          getCsvData={getCsvData}
          filename={t('filename.asset-categories')}
        />
        {isCentralServer && (
          <BaseButton
            startIcon={<EditIcon />}
            variant="outlined"
            onClick={() => {
              navigate(path);
            }}
          >
            {t('button.manage-asset-log-reasons')}
          </BaseButton>
        )}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
