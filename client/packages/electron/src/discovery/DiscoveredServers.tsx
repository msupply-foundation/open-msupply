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
  useElectronClient,
  useTranslation,
  frontEndHostUrl,
  CheckboxEmptyIcon,
} from '@openmsupply-client/common';

export const DiscoveredServers = () => {
  const { servers, discoveryTimedOut } = useElectronClient(true);
  const t = useTranslation('app');

  if (Object.keys(servers).length === 0)
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
      <MenuList>
        {Object.entries(servers).map(([key, server]) => (
          <MenuItem
            key={key}
            onClick={() => {
              window.electronAPI.connectToServer(server);
            }}
            sx={{ color: 'inherit' }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              <CheckboxEmptyIcon fontSize="small" color="inherit" />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ sx: { color: 'inherit' } }}>
              {frontEndHostUrl(server)}
            </ListItemText>
            {server.isLocal && <HomeIcon fontSize="small" color="inherit" />}
          </MenuItem>
        ))}
      </MenuList>
    </Box>
  );
};
