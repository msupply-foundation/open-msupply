import React from 'react';
import {
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
import { useAssetCatalogueListAll } from '../api';
import { assetCatalogueItemsListToCsv } from '../utils';

export const AppBarButtonsComponent = ({
  importModalController,
}: {
  importModalController: ToggleState;
}) => {
  const t = useTranslation();
  const isCentralServer = useIsCentralServerApi();
  const navigate = useNavigate();
  const { fetchAsync, isLoading } = useAssetCatalogueListAll();

  const path = RouteBuilder.create(AppRoute.Catalogue)
    .addPart(AppRoute.Assets)
    .addPart(AppRoute.LogReasons)
    .build();

  const getCsvData = async () => {
    const result = await fetchAsync();
    return result?.nodes?.length
      ? assetCatalogueItemsListToCsv(result.nodes, t)
      : null;
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
          isLoading={isLoading}
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
