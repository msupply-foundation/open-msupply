import React, { FC } from "react";
import {
  NothingHere,
  useTranslation,
  RouteBuilder,
  useNavigate,
  BasicSpinner,
  ButtonWithIcon,
  TuneIcon,
  QrCodeScannerIcon,
} from "@openmsupply-client/common";
import { AppRoute } from '@openmsupply-client/config';
import { Box, Typography, Card, CardContent } from "@mui/material";
import { Status } from '../../Equipment/Components';
import { useAssets } from "../../Equipment/api";
import { SimpleLabelDisplay } from "../Components/SimpleLabelDisplay";

export const CardListView: FC = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { data, isError, isLoading } = useAssets.document.list();
  const equipmentRoute = RouteBuilder.create(AppRoute.Coldchain).addPart(
    AppRoute.Equipment
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
    return <NothingHere body={t('error.no-items-to-display')} />
  }

  return (
    <Box sx={{
      width: '100%',
      flex: 1,
    }}>
      <Box sx={{
        width: '100%',
        minHeight: '50px',
        display: 'flex',
        justifyContent: 'space-evenly',
        padding: '.75rem',
      }}>
        <ButtonWithIcon
          shouldShrink={false}
          label={t("label.filters")}
          onClick={() => { }}
          Icon={<TuneIcon />}
        />
        <ButtonWithIcon
          shouldShrink={false}
          label="Scan Asset"
          onClick={() => { }}
          Icon={<QrCodeScannerIcon />}
        />
      </Box>
      <Box sx={{
        display: 'flex',
        flexDirection: "column",
        alignItems: 'center',
        padding: '10px 5px',
        gap: 1,
        overflow: 'auto',
        overflowY: 'scroll',
      }}>

        {data.nodes.map(n => (
          <Card key={n.id} sx={{
            minWidth: 330,
            padding: '10px 5px',
            border: '1px solid',
            borderColor: '#eee',
            borderRadius: '16px',
          }}
            onClick={() => { navigate(equipmentRoute.addPart(n.id).build()) }}
          >
            <CardContent>
              <SimpleLabelDisplay
                label="Manufacturer"
                value={n.catalogueItem?.manufacturer || "n/a"}
              />
              <SimpleLabelDisplay
                label="Type"
                value={n.assetType?.name || "n/a"}
              />
            </CardContent>
            <Box padding=".2em">
              <Status status={n.statusLog?.status} />
            </Box>
          </Card>
        ))}
      </Box>
    </Box>
  )
}