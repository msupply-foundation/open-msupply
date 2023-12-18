import React from 'react';
import {
  BaseButton,
  Box,
  CircularProgress,
  CloseIcon,
  DateUtils,
  ErrorWithDetails,
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
import { AppRoute } from '@openmsupply-client/config';
import { BreachDot } from './types';
import { parseBreachType } from '@openmsupply-client/coldchain';
import {
  TemperatureBreachFragment,
  useTemperatureBreach,
} from '../../api/TemperatureBreach';

interface BreachPopperProps {
  breachDot: BreachDot;
  onClose: () => void;
}

export const BreachPopover = ({ breachDot, onClose }: BreachPopperProps) => {
  const {
    position,
    breach: { sensor, ids: breachIds },
  } = breachDot;

  const { data, isLoading } = useTemperatureBreach.document.list({
    filterBy: { id: { equalTo: breachIds?.[0] ?? '' } },
    offset: 0,
    first: 1,
    sortBy: {
      key: TemperatureBreachSortFieldInput.StartDatetime,
      direction: 'desc',
    },
  });

  const breach = data?.nodes?.[0] ?? null;

  return (
    <Popover
      open={true}
      anchorEl={{ nodeType: 1, getBoundingClientRect: () => position }}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      slotProps={{ paper: { sx: { borderRadius: 4 } } }}
    >
      <Content
        isLoading={isLoading}
        breach={breach}
        sensor={sensor}
        onClose={onClose}
      />
    </Popover>
  );
};

const Content = ({
  breach,
  isLoading,
  onClose,
  sensor,
}: {
  breach: TemperatureBreachFragment | null | undefined;
  isLoading: boolean;
  onClose: () => void;
  sensor: { id: string; name: string };
}) => {
  const navigate = useNavigate();
  const t = useTranslation('coldchain');

  if (isLoading) return <CircularProgress />;

  return (
    <>
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
        sx={{ minHeight: '200px', width: '290px' }}
        paddingX={3}
      >
        {!breach ? (
          <Box sx={{ marginTop: '25px' }}>
            <ErrorWithDetails
              error={t('error.unable-to-load-breach')}
              details=""
            />
          </Box>
        ) : (
          <>
            <Typography
              sx={{ fontSize: 14, fontWeight: 600, paddingBottom: 1 }}
            >
              {sensor.name} {t('heading.breach')}
              <BreachIcon type={breach?.type} />
            </Typography>
            <Row
              label={t('label.location')}
              value={breach?.location?.name ?? ''}
            />
            <Row
              label={t('label.breach-start')}
              value={Formatter.dateTime(
                DateUtils.getDateOrNull(breach.startDatetime)
              )}
            />
            <Row
              label={t('label.breach-end')}
              value={Formatter.dateTime(
                DateUtils.getDateOrNull(breach.endDatetime)
              )}
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
          </>
        )}
      </Box>
    </>
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
  const { temperature } = parseBreachType(type);
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
