import React from 'react';
import {
  BaseButton,
  Box,
  CloseIcon,
  Formatter,
  IconButton,
  Popover,
  RouteBuilder,
  SnowflakeIcon,
  SunIcon,
  TemperatureBreachNodeType,
  TemperatureBreachSortFieldInput,
  Typography,
  useNavigate,
  useTheme,
  useTranslation,
} from '@openmsupply-client/common';
import { AppRoute } from 'packages/config/src';
import { Breach } from './TemperatureChart';
import { Sensor } from './useTemperatureChartData';

interface BreachPopperProps {
  breach: Breach | null;
  sensor?: Sensor;
  onClose: () => void;
}
export const BreachPopover = ({
  breach,
  onClose,
  sensor,
}: BreachPopperProps) => {
  const navigate = useNavigate();
  const t = useTranslation('coldchain');

  return breach === null ? null : (
    <Popover
      open={Boolean(breach?.anchor)}
      anchorEl={breach?.anchor}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      slotProps={{ paper: { sx: { borderRadius: 4 } } }}
    >
      <Box flex={1} justifyContent="flex-end" display="flex">
        <IconButton
          color="primary"
          onClick={onClose}
          icon={<CloseIcon />}
          label={t('button.close')}
        />
      </Box>
      <Box
        display="flex"
        flexDirection="column"
        sx={{ width: '290px' }}
        paddingX={3}
      >
        <Typography sx={{ fontSize: 14, fontWeight: 600, paddingBottom: 1 }}>
          {sensor && sensor.name} {t('heading.breach')}
          <BreachIcon type={breach.type} />
        </Typography>
        <Row label={t('label.location')} value={breach?.location ?? ''} />
        <Row
          label={t('label.breach-start')}
          value={Formatter.dateTime(breach.startDateTime)}
        />
        <Row
          label={t('label.breach-end')}
          value={Formatter.dateTime(breach.endDateTime)}
        />
        <Box flex={1} justifyContent="center" display="flex" paddingY={2}>
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
    </Popover>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <Box display="flex">
    <Typography sx={{ fontSize: 14, fontWeight: 600, paddingRight: 1 }}>
      {label}:
    </Typography>
    <Typography sx={{ fontSize: 14 }}>{value}</Typography>
  </Box>
);

const BreachIcon = ({ type }: { type: TemperatureBreachNodeType }) => {
  const temperature = type?.split('_')[0];
  const theme = useTheme();

  return temperature === 'HOT' ? (
    <SunIcon
      sx={{
        paddingLeft: 0.5,
        stroke: theme.palette.warning.main,
        fill: 'none',
      }}
    />
  ) : (
    <SnowflakeIcon
      sx={{ paddingLeft: 0.5, stroke: theme.palette.secondary.dark }}
    />
  );
};
