import React from 'react';
import {
  BaseButton,
  Box,
  CloseIcon,
  IconButton,
  Paper,
  RouteBuilder,
  TemperatureBreachSortFieldInput,
  Typography,
  useNavigate,
  useTranslation,
} from '@openmsupply-client/common';
import { AppRoute } from 'packages/config/src';
import { PopperProps } from './TemperatureChart';
import { Sensor } from './useTemperatureChartData';

export const BreachPopper = ({
  x,
  y,
  onClose,
  payload,
  sensors,
  visible,
}: PopperProps & { onClose: () => void; sensors: Sensor[] }) => {
  const navigate = useNavigate();
  const t = useTranslation('coldchain');
  const sensor = sensors?.find(s => s.id === payload?.sensorId);
  console.info(payload);
  return (
    <Paper
      sx={{
        borderRadius: 3,
        padding: 2,
        position: 'absolute',
        left: x,
        top: y,
        zIndex: 999,
        display: visible ? 'block' : 'none',
        width: '290px',
      }}
    >
      <Box display="flex" flexDirection="column">
        <Box flex={1} justifyContent="flex-end" display="flex">
          <IconButton
            color="primary"
            onClick={onClose}
            icon={<CloseIcon />}
            label={t('button.close')}
          />
        </Box>
        <Typography sx={{ fontSize: 14, fontWeight: 600, paddingBottom: 2 }}>
          {sensor && sensor.name} {t('heading.breach')}
        </Typography>
        <Box flex={1} justifyContent="center" display="flex">
          <BaseButton
            variant="contained"
            onClick={() =>
              navigate(
                RouteBuilder.create(AppRoute.Coldchain)
                  .addPart(AppRoute.Monitoring)
                  .addQuery({ tab: t('label.breaches') })
                  .addQuery({
                    sort: TemperatureBreachSortFieldInput.StartDatetime,
                  })
                  .build()
              )
            }
            sx={{ padding: 2 }}
          >
            {t('button.view-all-breaches')}
          </BaseButton>
        </Box>
      </Box>
    </Paper>
  );
};
