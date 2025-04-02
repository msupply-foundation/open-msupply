import React from 'react';
import {
  DownloadIcon,
  useNotification,
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  FileUtils,
  EnvUtils,
  Platform,
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
  const { success, error } = useNotification();
  const navigate = useNavigate();

  const csvExport = async () => {
    if (!assets || !assets?.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = assetCatalogueItemsListToCsv(assets, t);
    FileUtils.exportCSV(csv, t('filename.asset-categories'));
    success(t('success'))();
  };
  const path = RouteBuilder.create(AppRoute.Catalogue)
    .addPart(AppRoute.Assets)
    .addPart(AppRoute.LogReasons)
    .build();

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
        <BaseButton
          startIcon={<DownloadIcon />}
          variant="outlined"
          onClick={csvExport}
          disabled={EnvUtils.platform === Platform.Android}
        >
          {t('button.export')}
        </BaseButton>
        {isCentralServer && (
          <BaseButton
            startIcon={<EditIcon />}
            variant="outlined"
            onClick={() => {
              navigate(path);
            }}
            disabled={EnvUtils.platform === Platform.Android}
          >
            {t('button.manage-asset-log-reasons')}
          </BaseButton>
        )}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
