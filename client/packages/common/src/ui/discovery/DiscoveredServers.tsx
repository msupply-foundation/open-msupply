import React from 'react';
import {
  AlertIcon,
  Box,
  HomeIcon,
  InlineSpinner,
  MenuItem,
  MenuList,
  Typography,
  useTranslation,
  frontEndHostDisplay,
  CheckboxEmptyIcon,
  FrontEndHost,
  useNativeClient,
  GqlProvider,
  QueryClientProvider,
  QueryClient,
  frontEndHostGraphql,
  useInitialisationStatus,
  InitialisationStatusType,
  IconButton,
  RefreshIcon,
} from '@openmsupply-client/common';

type ConnectToServer = ReturnType<typeof useNativeClient>['connectToServer'];

type DiscoverServersProps = {
  servers: FrontEndHost[];
  connect: ConnectToServer;
  discoveryTimedOut: boolean;
  discover: () => void;
};

export const DiscoveredServers = ({
  servers,
  connect,
  discoveryTimedOut,
  discover,
}: DiscoverServersProps) => {
  const t = useTranslation('app');

  if (discoveryTimedOut)
    return (
      <Box
        display="flex"
        sx={{ color: 'error.main' }}
        justifyContent="center"
        flexDirection="column"
      >
        <Box display="flex" gap={1}>
          <Box>
            <AlertIcon />
          </Box>
          <Box>
            <Typography sx={{ color: 'inherit' }}>
              {t('error.server-not-found')}
            </Typography>
          </Box>
        </Box>
      </Box>
    );

  if (servers.length === 0)
    return (
      <Box
        display="flex"
        flex={1}
        justifyContent="center"
        alignContent="center"
      >
        <InlineSpinner messageKey="searching" />
      </Box>
    );

  return (
    <Box sx={{ minWidth: '325px', color: 'gray.dark' }}>
      <Box display="flex" gap={1}>
        <Typography
          sx={{
            fontSize: {
              xs: '19px',
              sm: '19px',
              md: '24px',
              lg: '32px',
              xl: '32px',
            },
            fontWeight: 700,
            color: 'primary.main',
          }}
        >
          {t('discovery.select-server')}
        </Typography>
        <IconButton
          icon={<RefreshIcon color="primary" fontSize="small" />}
          onClick={discover}
          label={t('button.refresh')}
        />
      </Box>
      <MenuList style={{ overflowY: 'auto', maxHeight: '200px' }}>
        {servers.map(server => (
          <DiscoveredServerWrapper
            key={`${server.hardwareId}${server.port}`}
            server={server}
            connect={connect}
          />
        ))}
      </MenuList>
    </Box>
  );
};

type DiscoveredServerProps = { server: FrontEndHost; connect: ConnectToServer };

const DiscoveredServerWrapper: React.FC<DiscoveredServerProps> = params => (
  <QueryClientProvider client={new QueryClient()}>
    <GqlProvider url={frontEndHostGraphql(params.server)}>
      <DiscoveredServer {...params} />
    </GqlProvider>
  </QueryClientProvider>
);

const DiscoveredServer: React.FC<DiscoveredServerProps> = ({
  server,
  connect,
}) => {
  const { data: initStatus } = useInitialisationStatus();
  const t = useTranslation();

  const getSiteName = () => {
    if (initStatus?.status == InitialisationStatusType.Initialised)
      return initStatus?.siteName;
    return t('messages.not-initialised');
  };

  return (
    <MenuItem
      onClick={() => {
        connect(server);
      }}
      sx={{ color: 'inherit' }}
    >
      <Box alignItems="center" display="flex" gap={2}>
        <Box flex={0}>
          <CheckboxEmptyIcon fontSize="small" color="primary" />
        </Box>
        <Box flexShrink={0} flexBasis="200px">
          <Typography
            sx={{
              color:
                initStatus?.status == InitialisationStatusType.Initialised
                  ? 'inherit'
                  : 'gray.light',
              fontSize: 20,
              fontWeight: 'bold',
              lineHeight: 1,
            }}
          >
            {getSiteName()}
          </Typography>
          <Typography sx={{ fontSize: 11 }}>
            {frontEndHostDisplay(server)}
          </Typography>
        </Box>
        {server.isLocal && <HomeIcon fontSize="small" color="primary" />}
      </Box>
    </MenuItem>
  );
};
