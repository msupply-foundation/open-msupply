import React, { useMemo, useState } from 'react';
import {
  Autocomplete,
  BasicSpinner,
  DateTimePickerInput,
  NothingHere,
  Typography,
} from '@common/components';
import {
  AssetLogFilterInput,
  AssetLogStatusNodeType,
  Box,
  Paper,
  SettingsCircleIcon,
  UNDEFINED_STRING_VALUE,
  UserCircleIcon,
  StatusChip,
} from '@openmsupply-client/common';
import {
  DateUtils,
  useFormatDateTime,
  useIntlUtils,
  useTranslation,
} from '@common/intl';
import { ColdchainAssetLogFragment, useAssets } from '../../api';
import { FileList } from '../../Components';
import { statusColourMap, TEMPERATURE_MAPPING_TYPE } from '../../utils';

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
  const t = useTranslation();
  const { getLocalisedFullName } = useIntlUtils();
  const fullName = getLocalisedFullName(user?.firstName, user?.lastName);

  return (
    <Box
      display="flex"
      alignItems="flex-start"
      sx={theme => ({
        [theme.breakpoints.down('sm')]: {
          flexDirection: 'column',
          marginTop: '.25em',
        },
      })}
    >
      <Typography
        sx={theme => ({
          [theme.breakpoints.down('sm')]: {
            fontSize: '14px!important',
          },
          fontWeight: 'bold',
          fontSize: '12px',
        })}
      >
        {t('label.user')}: {user?.username ?? UNDEFINED_STRING_VALUE}
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
  const t = useTranslation();
  const { localisedDate } = useFormatDateTime();
  const status = log.status ? statusColourMap(log.status) : undefined;

  return (
    <Box
      flex={0}
      display="flex"
      flexDirection="row"
      justifyContent="space-between"
      sx={theme => ({
        [theme.breakpoints.down('sm')]: {
          flexDirection: 'column',
        },
      })}
    >
      <Box
        flex={0}
        display="flex"
        flexDirection="column"
        alignItems="center"
        sx={theme => ({
          [theme.breakpoints.down('sm')]: {
            display: 'none',
          },
        })}
      >
        <Connector visible={!isFirst} />
        <Icon username={log.user?.username ?? UNDEFINED_STRING_VALUE} />
        <Connector visible={!isLast} />
      </Box>
      <Paper
        elevation={3}
        sx={theme => ({
          [theme.breakpoints.down('sm')]: {
            flexDirection: 'column',
            margin: 0,
            marginLeft: 0,
            marginBottom: 2,
          },
          borderRadius: 4,
          flex: 1,
          margin: 2,
          marginLeft: 4,
          padding: 2,
          flexWrap: 'nowrap',
          display: 'flex',
        })}
      >
        <Box display="flex" flex={0.7} flexDirection="column">
          <Box
            display="flex"
            alignItems="flex-start"
            gap="1em"
            sx={theme => ({
              [theme.breakpoints.down('sm')]: {
                flexDirection: 'column',
                gap: '.25em',
              },
            })}
          >
            <Typography
              sx={theme => ({
                [theme.breakpoints.down('sm')]: {
                  fontSize: '14px!important',
                },
                fontWeight: 'bold',
                lineHeight: 2,
              })}
            >
              {localisedDate(log.logDatetime)}
            </Typography>
            {status && (
              <StatusChip
                label={t(status.label)}
                colour={status.colour}
              />
            )}
            {log.type && (
              <StatusChip
                label={
                  log.type === TEMPERATURE_MAPPING_TYPE
                    ? t('label.temperature-mapping')
                    : log.type
                }
                colour="gray.main"
              />
            )}
          </Box>
          <User user={log.user} />
          <Box display="flex" alignItems="flex-start">
            <Typography
              sx={theme => ({
                [theme.breakpoints.down('sm')]: {
                  fontSize: '14px!important',
                },
                fontSize: '12px',
              })}
            >
              <b>{t('label.reason')}:</b>{' '}
              {log.reason?.reason ?? UNDEFINED_STRING_VALUE}
            </Typography>
          </Box>
          <Typography
            sx={theme => ({
              [theme.breakpoints.down('sm')]: {
                fontSize: '14px!important',
              },
              fontSize: '12px',
            })}
          >
            <b>{t('label.observations')}:</b>{' '}
            {log.comment ?? UNDEFINED_STRING_VALUE}
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

type EventOption = {
  label: string;
  value: 'status' | 'type';
};

const useEventOptions = (): EventOption[] => {
  const t = useTranslation();
  return useMemo<EventOption[]>(
    () => [
      { label: t('label.status-change'), value: 'status' },
      { label: t('label.temperature-mapping'), value: 'type' },
    ],
    [t]
  );
};

const LogFilters = ({
  fromDate,
  toDate,
  selectedEvent,
  eventOptions,
  onFromDateChange,
  onToDateChange,
  onEventChange,
}: {
  fromDate: Date | null;
  toDate: Date | null;
  selectedEvent: EventOption | null;
  eventOptions: EventOption[];
  onFromDateChange: (date: Date | null) => void;
  onToDateChange: (date: Date | null) => void;
  onEventChange: (value: EventOption | null) => void;
}) => {
  const t = useTranslation();

  return (
    <Box
      display="flex"
      gap={2}
      paddingX={8}
      paddingTop={2}
      alignItems="center"
      flexWrap="wrap"
      sx={theme => ({
        [theme.breakpoints.down('sm')]: {
          paddingX: 1,
          flexDirection: 'column',
          alignItems: 'stretch',
        },
      })}
    >
      <Box display="flex" alignItems="center" gap={1}>
        <Typography sx={{ fontWeight: 'bold', fontSize: '14px' }}>
          {t('label.from-date')}:
        </Typography>
        <DateTimePickerInput
          value={fromDate}
          format="P"
          onChange={onFromDateChange}
          width={180}
        />
      </Box>
      <Box display="flex" alignItems="center" gap={1}>
        <Typography sx={{ fontWeight: 'bold', fontSize: '14px' }}>
          {t('label.to-date')}:
        </Typography>
        <DateTimePickerInput
          value={toDate}
          format="P"
          onChange={onToDateChange}
          width={180}
        />
      </Box>
      <Box display="flex" alignItems="center" gap={1}>
        <Typography sx={{ fontWeight: 'bold', fontSize: '14px' }}>
          {t('label.event')}:
        </Typography>
        <Autocomplete
          value={selectedEvent}
          options={eventOptions}
          onChange={(_, option) => onEventChange(option ?? null)}
          isOptionEqualToValue={(a, b) => a.value === b.value}
          width="280px"
          clearable
        />
      </Box>
    </Box>
  );
};

export const StatusLogs = ({ assetId }: { assetId: string }) => {
  const t = useTranslation();
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventOption | null>(null);
  const eventOptions = useEventOptions();

  const additionalFilter: Partial<AssetLogFilterInput> = {};
  if (fromDate || toDate) {
    additionalFilter.logDatetime = {};
    if (fromDate) {
      additionalFilter.logDatetime.afterOrEqualTo =
        DateUtils.startOfDay(fromDate).toISOString();
    }
    if (toDate) {
      additionalFilter.logDatetime.beforeOrEqualTo =
        DateUtils.endOfDay(toDate).toISOString();
    }
  }
  if (selectedEvent) {
    if (selectedEvent.value === 'status') {
      additionalFilter.status = {
        equalAny: Object.values(AssetLogStatusNodeType),
      };
    } else {
      additionalFilter.type = { equalTo: TEMPERATURE_MAPPING_TYPE };
    }
  }

  const hasFilter = fromDate || toDate || selectedEvent;
  const { data: logs, isLoading } = useAssets.log.list(
    assetId,
    hasFilter ? additionalFilter : undefined
  );

  return (
    <Box display="flex" flex={1} flexDirection="column">
      <LogFilters
        fromDate={fromDate}
        toDate={toDate}
        selectedEvent={selectedEvent}
        eventOptions={eventOptions}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onEventChange={setSelectedEvent}
      />
      {isLoading ? (
        <BasicSpinner />
      ) : logs?.totalCount === 0 ? (
        <NothingHere body={t('messages.no-status-logs')} />
      ) : (
        <Box
          paddingX={8}
          paddingY={4}
          display="flex"
          flex={1}
          flexDirection="column"
          sx={theme => ({
            [theme.breakpoints.down('sm')]: {
              paddingX: 0,
              paddingY: 0,
              justifyItems: 'center',
            },
          })}
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
      )}
    </Box>
  );
};
