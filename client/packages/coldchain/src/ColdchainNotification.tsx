import React, { PropsWithChildren } from 'react';
import {
  BaseButton,
  Box,
  RouteBuilder,
  TemperatureBreachSortFieldInput,
  Typography,
  useMatch,
  useNavigate,
  useUrlQuery,
} from '@openmsupply-client/common';
import { useFormatDateTime, useTranslation } from '@common/intl';
import { CircleAlertIcon } from '@common/icons';
import { alpha, useTheme } from '@common/styles';
import { AppRoute } from '@openmsupply-client/config';
import {
  TemperatureBreachFragment,
  useTemperatureBreach,
} from './Monitoring/api/TemperatureBreach';

const Text: React.FC<PropsWithChildren> = ({ children }) => (
  <Typography
    component="div"
    sx={{
      fontSize: '14px',
      display: 'flex',
      alignContent: 'center',
      flexWrap: 'wrap',
    }}
  >
    {children}
  </Typography>
);

const Separator = () => (
  <Text>
    <Typography paddingX={0.5}>|</Typography>
  </Text>
);

const DetailButton = ({ breach }: { breach: TemperatureBreachFragment }) => {
  const t = useTranslation('coldchain');
  const navigate = useNavigate();
  const { urlQuery } = useUrlQuery();
  const currentTab = (urlQuery['tab'] as string) ?? '';
  const isColdchain = useMatch(
    RouteBuilder.create(AppRoute.Coldchain).addWildCard().build()
  );

  if (isColdchain && currentTab === t('label.breaches')) return null;

  return (
    <BaseButton
      variant="contained"
      style={{ height: 32 }}
      onClick={() =>
        navigate(
          RouteBuilder.create(AppRoute.Coldchain)
            .addPart(AppRoute.Monitoring)
            .addQuery({ tab: t('label.breaches') })
            .addQuery({
              sort: TemperatureBreachSortFieldInput.StartDatetime,
            })
            .addQuery({ unacknowledged: true })
            .addQuery({ 'sensor.name': breach.sensor?.name ?? '' })
            .build()
        )
      }
    >
      {t('button.view-details')}
    </BaseButton>
  );
};
const Location = ({ breach }: { breach: TemperatureBreachFragment }) => {
  const t = useTranslation('coldchain');

  if (!breach?.location?.name) return null;
  return (
    <>
      <Separator />
      {!!breach?.location?.name && (
        <Text>
          {t('message.location')}
          <b style={{ paddingLeft: 4 }}>{breach.location.name}</b>
        </Text>
      )}
    </>
  );
};

export const ColdchainNotification = () => {
  const theme = useTheme();
  const t = useTranslation('coldchain');
  const { data: breaches } = useTemperatureBreach.document.notifications({
    first: 1,
    offset: 0,
    sortBy: { key: 'startDatetime', direction: 'desc', isDesc: true },
    filterBy: { unacknowledged: true },
  });
  const { localisedDistanceToNow } = useFormatDateTime();
  const breach = breaches?.nodes?.[0];

  if (!breach) return null;

  return (
    <Box
      sx={{
        borderBottom: '1px solid',
        borderBottomColor: 'primary.main',
        backgroundColor: alpha(theme.palette.primary.main, 0.075),
        flex: '0 0 54px',
        display: 'flex',
        paddingLeft: 2,
        alignContent: 'center',
        flexWrap: 'wrap',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignContent: 'center',
          flexWrap: 'wrap',
          marginRight: 1,
        }}
      >
        <CircleAlertIcon
          fill={theme.palette.error.main}
          sx={{
            color: 'background.white',
          }}
          width={27}
          height={27}
        />
      </Box>
      <Text>
        <b>
          {t('message.notification-breach-detected', {
            time: localisedDistanceToNow(breach.startDatetime),
          })}
        </b>
      </Text>
      <Separator />
      {!!breach.maxOrMinTemperature && (
        <>
          <Text>
            {t('message.last-temperature', {
              temperature: breach.maxOrMinTemperature,
            })}
          </Text>
          <Separator />
        </>
      )}
      <Text>
        {t('message.device')}
        <b style={{ paddingLeft: 4 }}>{breach.sensor?.name}</b>
      </Text>
      <Location breach={breach} />
      <Box
        sx={{
          justifyContent: 'flex-end',
          display: 'flex',
          flex: 1,
          marginRight: 2,
          height: '32px',
        }}
      >
        <DetailButton breach={breach} />
      </Box>
    </Box>
  );
};
