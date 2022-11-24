import React from 'react';
import {
  AlertIcon,
  Box,
  HomeIcon,
  InlineSpinner,
  ListItemIcon,
  ListItemText,
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
} from '@openmsupply-client/common';

type ConnectToServer = ReturnType<typeof useNativeClient>['connectToServer'];

type DiscoverServersProps = {
  servers: FrontEndHost[];
  connect: ConnectToServer;
  discoveryTimedOut: boolean;
};

export const DiscoveredServers = ({
  servers,
  connect,
  discoveryTimedOut,
}: DiscoverServersProps) => {
  const t = useTranslation('app');

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

  return (
    <Box sx={{ minWidth: '300px', color: 'gray.dark' }}>
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
    return t('app.initialise');
  };

  return (
    <MenuItem
      onClick={() => {
        connect(server);
      }}
      sx={{ color: 'inherit' }}
    >
      <ListItemIcon sx={{ color: 'inherit' }}>
        <CheckboxEmptyIcon fontSize="small" color="inherit" />
      </ListItemIcon>
      <ListItemText primaryTypographyProps={{ sx: { color: 'inherit' } }}>
        {`${frontEndHostDisplay(server)} ${getSiteName()} `}
      </ListItemText>
      {server.isLocal && <HomeIcon fontSize="small" color="inherit" />}
    </MenuItem>
  );
};
