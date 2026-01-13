import React from 'react';
import {
  NothingHere,
  useTranslation,
  RouteBuilder,
  useNavigate,
  BasicSpinner,
  ButtonWithIcon,
  PlusCircleIcon,
  useToggle,
  UserPermission,
  useCallbackWithPermission,
  BaseButton,
  InlineSpinner,
  StatusChip,
  LocaleKey,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { useAssets } from '../../Equipment/api';
import { SimpleLabelDisplay } from '../Components/SimpleLabelDisplay';
import { AddFromScannerButton } from '../../Equipment/ListView/AddFromScannerButton';
import { CreateAssetModal } from '../../Equipment/ListView/CreateAssetModal';
import { ImportFridgeTag } from '../../common/ImportFridgeTag';
import { statusColourMap } from '../../Equipment/utils';

export const CardListView = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const modalController = useToggle();
  const equipmentRoute = RouteBuilder.create(AppRoute.Coldchain).addPart(
    AppRoute.Equipment
  );

  const {
    data,
    isError,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useAssets.document.infiniteAssets({
    rowsPerPage: 20,
  });

  const onAdd = useCallbackWithPermission(
    UserPermission.AssetMutate,
    modalController.toggleOn,
    t('error.no-asset-create-permission')
  );

  if (isLoading) return <BasicSpinner />;

  if (isError) {
    return (
      <Box sx={{ padding: 2 }}>
        <Typography sx={{ color: 'error.main' }}>
          {t('error.unable-to-load-data')}
        </Typography>
      </Box>
    );
  }

  const nodes = data?.pages?.flatMap(page => page.data?.nodes ?? []) ?? [];

  if (!data) {
    return <NothingHere body={t('error.no-items-to-display')} />;
  }

  return (
    <Box
      sx={{
        width: '100%',
        flex: 1,
      }}
    >
      <Box
        sx={{
          width: '100%',
          minHeight: '50px',
          display: 'flex',
          padding: '.75rem',
          gap: '.5em',
        }}
      >
        <ButtonWithIcon
          shouldShrink={true}
          label={t('button.new-asset')}
          onClick={onAdd}
          Icon={<PlusCircleIcon />}
        />
        <AddFromScannerButton />
        <ImportFridgeTag shouldShrink={true} />
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '0px 0px',
          gap: 1,
          overflowY: 'auto',
        }}
      >
        {nodes?.map(n => (
          <Card
            key={n.id}
            sx={{
              width: '90%',
              maxWidth: '400px',
              padding: '0px 5px 5px 5px',
              border: '1px solid',
              borderColor: '#eee',
              borderRadius: '16px',
            }}
            onClick={() => {
              navigate(equipmentRoute.addPart(n.id).build());
            }}
          >
            <CardContent>
              <SimpleLabelDisplay
                label={t('label.manufacturer')}
                value={n.catalogueItem?.manufacturer || 'n/a'}
              />
              <SimpleLabelDisplay
                label={t('label.type')}
                value={n.assetType?.name || 'n/a'}
              />
              <SimpleLabelDisplay
                label={t('label.asset-number')}
                value={n.assetNumber || 'n/a'}
              />
            </CardContent>
            <Box padding=".2em">
              <StatusChip
                label={
                  n.statusLog?.status
                    ? t(
                        statusColourMap(n.statusLog?.status)?.label as LocaleKey
                      )
                    : undefined
                }
                colour={
                  n.statusLog?.status
                    ? statusColourMap(n.statusLog?.status)?.colour
                    : undefined
                }
              />
            </Box>
          </Card>
        ))}
        {hasNextPage && (
          <BaseButton
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            sx={{ my: 2 }}
          >
            {t('button.more')}
          </BaseButton>
        )}
        {isFetchingNextPage && <InlineSpinner />}
      </Box>
      <CreateAssetModal
        isOpen={modalController.isOn}
        onClose={modalController.toggleOff}
      />
    </Box>
  );
};
