import React, { PropsWithChildren, ReactNode } from 'react';
import {
  BaseButton,
  Box,
  RouteBuilder,
  TemperatureBreachSortFieldInput,
  TemperatureLogSortFieldInput,
  Typography,
  useMatch,
  useNavigate,
  useUrlQuery,
} from '@openmsupply-client/common';
import { LocaleKey, useFormatDateTime, useTranslation } from '@common/intl';
import { CircleAlertIcon } from '@common/icons';
import { alpha, useTheme } from '@common/styles';
import { AppRoute } from '@openmsupply-client/config';
import { useTemperatureNotification } from './Monitoring/api';
import { TemperatureNotificationBreachFragment } from './Monitoring/api';
import { TemperatureExcursionFragment } from './Monitoring/api/TemperatureNotification/operations.generated';

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

const TotalCount = ({
  count,
  message,
}: {
  count: number;
  message: LocaleKey;
}) => {
  const t = useTranslation('coldchain');

  if (count < 2) return undefined;

  return (
    <Typography
      component="div"
      sx={{
        fontSize: '12px',
        display: 'flex',
        alignContent: 'center',
        flexWrap: 'wrap',
        marginLeft: 2,
        padding: '0 8px',
        color: 'gray.main',
        fontWeight: 500,
      }}
    >
      {t(message, {
        count,
      })}
    </Typography>
  );
};

const Separator = () => (
  <Text>
    <Typography paddingX={0.5}>|</Typography>
  </Text>
);

const DetailButton = ({
  notification,
  queryParameters,
  tab,
}: {
  notification:
    | TemperatureNotificationBreachFragment
    | TemperatureExcursionFragment;
  queryParameters: any;
  tab: string;
}) => {
  const t = useTranslation('coldchain');
  const navigate = useNavigate();
  const { urlQuery } = useUrlQuery();
  const currentTab = (urlQuery['tab'] as string) ?? '';
  const isColdchain = useMatch(
    RouteBuilder.create(AppRoute.Coldchain).addWildCard().build()
  );

  if (isColdchain && currentTab === tab) return null;

  return (
    <BaseButton
      variant="contained"
      style={{ height: 32 }}
      onClick={() =>
        navigate(
          RouteBuilder.create(AppRoute.Coldchain)
            .addPart(AppRoute.Monitoring)
            .addQuery({ tab })
            .addQuery(queryParameters)
            .addQuery({ 'sensor.name': notification.sensor?.name ?? '' })
            .build()
        )
      }
    >
      {t('button.view-details')}
    </BaseButton>
  );
};
const Location = ({
  notification,
}: {
  notification:
    | TemperatureNotificationBreachFragment
    | TemperatureExcursionFragment;
}) => {
  const t = useTranslation('coldchain');

  if (!notification?.location?.name) return null;
  return (
    <>
      <Separator />
      {!!notification?.location?.name && (
        <Text>
          {t('messages.location')}
          <b style={{ paddingLeft: 4 }}>{notification.location.name}</b>
        </Text>
      )}
    </>
  );
};

type NotificationProps = {
  message: LocaleKey;
  totalCount: number;
  totalCountMessage: LocaleKey;
  notification?:
    | TemperatureNotificationBreachFragment
    | TemperatureExcursionFragment;
  detailButton: ReactNode;
};

const Notification = ({
  detailButton,
  message,
  totalCount,
  totalCountMessage,
  notification,
}: NotificationProps) => {
  const theme = useTheme();
  const t = useTranslation('coldchain');
  const { localisedDistanceToNow } = useFormatDateTime();

  if (!notification) return null;

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
          {t(message, {
            time: localisedDistanceToNow(notification.startDatetime),
          })}
        </b>
      </Text>
      <Separator />
      {!!notification.maxOrMinTemperature && (
        <>
          <Text>
            {t('messages.last-temperature', {
              temperature: notification.maxOrMinTemperature,
            })}
          </Text>
          <Separator />
        </>
      )}
      <Text>
        {t('messages.device')}
        <b style={{ paddingLeft: 4 }}>{notification.sensor?.name}</b>
      </Text>
      <Location notification={notification} />
      <TotalCount message={totalCountMessage} count={totalCount} />

      <Box
        sx={{
          justifyContent: 'flex-end',
          display: 'flex',
          flex: 1,
          marginRight: 2,
          height: '32px',
        }}
      >
        {detailButton}
      </Box>
    </Box>
  );
};

export const ColdchainNotification = () => {
  const t = useTranslation('coldchain');
  const { data: notifications } = useTemperatureNotification.document.list({
    first: 1,
    offset: 0,
  });

  if (
    !notifications?.breaches?.totalCount &&
    !notifications?.excursions?.totalCount
  )
    return null;

  const breach = notifications?.breaches?.nodes?.[0];
  const excursion = notifications?.excursions?.nodes?.[0];
  const breachButton = !!breach ? (
    <DetailButton
      notification={breach}
      tab={t('label.breaches')}
      queryParameters={{
        sort: TemperatureBreachSortFieldInput.StartDatetime,
        unacknowledged: true,
      }}
    />
  ) : null;
  const excursionButton = !!excursion ? (
    <DetailButton
      notification={excursion}
      tab={t('label.log')}
      queryParameters={{
        sort: TemperatureLogSortFieldInput.Datetime,
        datetime: '_',
        dir: 'desc',
      }}
    />
  ) : null;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Notification
        message="messages.notification-breach-detected"
        totalCountMessage="messages.total-breaches"
        notification={notifications?.breaches?.nodes?.[0]}
        totalCount={notifications?.breaches?.totalCount ?? 0}
        detailButton={breachButton}
      />
      <Notification
        message="messages.notification-excursion-detected"
        totalCountMessage="messages.total-excursions"
        notification={notifications?.excursions?.nodes?.[0]}
        totalCount={notifications?.excursions?.totalCount ?? 0}
        detailButton={excursionButton}
      />
    </Box>
  );
};
