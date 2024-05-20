import React from 'react';
import { BasicSpinner, NothingHere, Typography } from '@common/components';
import {
  Box,
  Paper,
  SettingsCircleIcon,
  UserCircleIcon,
} from '@openmsupply-client/common';
import { useFormatDateTime, useIntlUtils, useTranslation } from '@common/intl';
import { ColdchainAssetLogFragment, useAssets } from '../../api';
import { Status } from '../../Components';
import { FileList } from '../../Components';

const Divider = () => (
  <Box
    sx={{
      backgroundColor: 'gray.dark',
      height: '12px',
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

const User = ({ user }: { user: ColdchainAssetLogFragment['user'] }) => {
  const t = useTranslation('coldchain');
  const { getLocalisedFullName } = useIntlUtils();
  const fullName = getLocalisedFullName(user?.firstName, user?.lastName);

  return (
    <Box display="flex" alignItems="flex-start">
      <Typography sx={{ fontWeight: 'bold', fontSize: '12px' }}>
        {t('label.user')}: {user?.username ?? '-'}
      </Typography>
      {!!fullName && <Divider />}
      {!!fullName && (
        <Typography sx={{ fontWeight: 'bold', fontSize: '12px' }}>
          {t('label.name')}: {fullName}
        </Typography>
      )}
      {!!user?.jobTitle && (
        <Typography sx={{ fontWeight: 'bold', fontSize: '12px' }}>
          , {user?.jobTitle}
        </Typography>
      )}
    </Box>
  );
};

const Icon = ({ username }: { username: string | undefined }) => {
  switch (username) {
    case 'omsupply_system':
      return (
        <SettingsCircleIcon
          sx={{ color: 'gray.main', width: 30, height: 30 }}
          stroke="#fff"
        />
      );
    default:
      return (
        <UserCircleIcon
          sx={{ color: 'gray.main', width: 30, height: 30 }}
          stroke="#fff"
        />
      );
  }
};

const StatusLog = ({
  isFirst,
  isLast,
  log,
}: {
  isFirst: boolean;
  isLast: boolean;
  log: ColdchainAssetLogFragment;
}) => {
  const { localisedDate } = useFormatDateTime();
  const t = useTranslation('coldchain');

  return (
    <Box
      flex={0}
      display="flex"
      flexDirection="row"
      justifyContent="space-between"
    >
      <Box flex={0} display="flex" flexDirection="column" alignItems="center">
        <Connector visible={!isFirst} />
        <Icon username={log.user?.username ?? '-'} />
        <Connector visible={!isLast} />
      </Box>
      <Paper
        elevation={3}
        sx={{
          borderRadius: 4,
          flex: 1,
          margin: 2,
          marginLeft: 4,
          padding: 2,
          flexWrap: 'nowrap',
          display: 'flex',
        }}
      >
        <Box display="flex" flex={0.7} flexDirection="column">
          <Box display="flex" alignItems="flex-start">
            <Typography sx={{ fontWeight: 'bold', lineHeight: 2 }}>
              {localisedDate(log.logDatetime)}
            </Typography>
            <div style={{ width: 16 }} />
            <Status status={log.status} />
          </Box>
          <User user={log.user} />
          <Box display="flex" alignItems="flex-start">
            <Typography sx={{ fontSize: '12px' }}>
              <b>{t('label.reason')}:</b> {log.reason?.reason ?? '-'}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '12px' }}>
            <b>{t('label.observations')}:</b> {log.comment ?? '-'}
          </Typography>
        </Box>
        <Box display="flex" flex={0.3}>
          <FileList
            assetId={log.id}
            files={log.documents.nodes.map(document => ({
              id: document.id,
              name: document.fileName,
            }))}
            padding={0.5}
            tableName="asset_log"
          />
        </Box>
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
