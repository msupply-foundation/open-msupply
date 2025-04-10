import React, { FC } from 'react';
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
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { Status } from '../../Equipment/Components';
import { useAssets } from '../../Equipment/api';
import { SimpleLabelDisplay } from '../Components/SimpleLabelDisplay';
import { AddFromScannerButton } from '../../Equipment/ListView/AddFromScannerButton';
import { CreateAssetModal } from '../../Equipment/ListView/CreateAssetModal';
import { useIsGapsStoreOnly } from '@openmsupply-client/common';
import { ImportFridgeTag } from '../../common/ImportFridgeTag';

export const CardListView: FC = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const isGaps = useIsGapsStoreOnly();
  const { data, isError, isLoading } = useAssets.document.list();
  const modalController = useToggle();
  const equipmentRoute = RouteBuilder.create(AppRoute.Coldchain).addPart(
    AppRoute.Equipment
  );
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
          shouldShrink={!isGaps}
          label="Add Asset"
          onClick={onAdd}
          Icon={<PlusCircleIcon />}
        />
        <AddFromScannerButton />
        <ImportFridgeTag shouldShrink={false} />
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '0px 0px',
          gap: 1,
          overflow: 'auto',
          overflowY: 'scroll',
        }}
      >
        {data.nodes.map(n => (
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
              <Status status={n.statusLog?.status} />
            </Box>
          </Card>
        ))}
      </Box>
      <CreateAssetModal
        isOpen={modalController.isOn}
        onClose={modalController.toggleOff}
      />
    </Box>
  );
};
