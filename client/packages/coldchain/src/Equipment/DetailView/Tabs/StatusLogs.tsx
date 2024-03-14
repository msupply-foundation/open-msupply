import React from 'react';
import { BasicSpinner, NothingHere, Typography } from '@common/components';
import { Box, Paper, UserCircleIcon } from '@openmsupply-client/common';
import { useFormatDateTime, useIntlUtils, useTranslation } from '@common/intl';
import { AssetLogFragment, useAssets } from '../../api';
import { Status } from '../../Components';
import { translateReason } from '../../utils';

const Divider = () => (
  <Box
    sx={{
      backgroundColor: 'gray.dark',
      height: '20px',
      marginX: 1,
      marginY: '4px',
      width: '2px',
    }}
  />
);
const Connector = ({ visible }: { visible: boolean }) => (
  <Box
    sx={{
      backgroundColor: visible ? 'gray.main' : 'none',
      flex: 1,
      width: '2px',
    }}
  />
);

const User = ({ user }: { user: AssetLogFragment['user'] }) => {
  const t = useTranslation('coldchain');
  const { getLocalisedFullName } = useIntlUtils();
  const fullName = getLocalisedFullName(user?.firstName, user?.lastName);

  return (
    <Box display="flex" alignItems="flex-start">
      <Typography sx={{ fontWeight: 'bold', fontSize: '12px' }}>
        {t('label.user')}: {user?.username}
      </Typography>
      {!!fullName && <Divider />}
      {!!fullName && (
        <Typography sx={{ fontWeight: 'bold', fontSize: '12px' }}>
          {t('label.name')}: {fullName}
        </Typography>
      )}
    </Box>
  );
};

const StatusLog = ({
  isFirst,
  isLast,
  log,
}: {
  isFirst: boolean;
  isLast: boolean;
  log: AssetLogFragment;
}) => {
  const sx = {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  };
  const { localisedDate } = useFormatDateTime();
  const t = useTranslation('coldchain');

  return (
    <Box sx={sx} flex={1} display="flex">
      <Box flex={0} display="flex" flexDirection="column" alignItems="center">
        <Connector visible={!isFirst} />
        <UserCircleIcon
          sx={{ color: 'gray.main', width: 30, height: 30 }}
          stroke="#fff"
        />
        <Connector visible={!isLast} />
      </Box>
      <Paper
        elevation={3}
        sx={{ borderRadius: 4, flex: 1, margin: 2, marginLeft: 4, padding: 2 }}
      >
        <Box display="flex" alignItems="flex-start">
          <Typography sx={{ fontWeight: 'bold', lineHeight: 2 }}>
            {localisedDate(log.logDatetime)}
          </Typography>
          {!!log.type && <Divider />}
          <Typography sx={{ fontWeight: 'bold', lineHeight: 2 }}>
            {log.type}
          </Typography>
          <div style={{ width: 16 }} />
          <Status status={log.status} />
        </Box>
        <User user={log.user} />
        <Box display="flex" alignItems="flex-start">
          <Typography sx={{ fontSize: '12px' }}>
            <b>{t('label.reason')}:</b> {translateReason(log.reason, t)}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '12px' }}>
          <b>{t('label.observations')}:</b> {log.comment ?? '-'}
        </Typography>
      </Paper>
    </Box>
  );
};

export const StatusLogs = ({ assetId }: { assetId: string }) => {
  const t = useTranslation('coldchain');

  const { data: logs, isLoading } = useAssets.log.list(assetId);

  if (isLoading) return <BasicSpinner />;

  if (logs?.totalCount === 0)
    return <NothingHere body={t('messages.no-status-logs')} />;

  return (
    <Box
      paddingX={8}
      paddingY={4}
      display="flex"
      flex={1}
      flexDirection="column"
    >
      {logs?.nodes?.map((log, index, nodes) => (
        <StatusLog
          log={log}
          key={log.id}
          isFirst={index === 0}
          isLast={index === nodes.length - 1}
        />
      ))}
    </Box>
  );
};
