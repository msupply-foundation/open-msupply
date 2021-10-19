import React from 'react';
import {
  Box,
  HomeIcon,
  styled,
  Typography,
  useHostContext,
  UserIcon,
} from '@openmsupply-client/common';

export const Footer: React.FC = () => {
  const { user, store } = useHostContext();
  const PaddedCell = styled(Box)({ display: 'flex' });
  const iconStyles = { color: 'midGrey', height: '16px', width: '16px' };
  const textStyles = {
    color: 'midGrey',
    fontSize: '12px',
    padding: '0 0 0 8px',
  };

  return (
    <Box
      gap={2}
      sx={{
        backgroundColor: 'background.toolbar',
        height: '32px',
      }}
      marginLeft={3}
      display="flex"
      alignItems="center"
    >
      <PaddedCell>
        <HomeIcon sx={iconStyles} />
        <Typography sx={textStyles}>{store.name}</Typography>
      </PaddedCell>
      <PaddedCell>
        <UserIcon sx={iconStyles} />
        <Typography sx={textStyles}>{user.name}</Typography>
      </PaddedCell>
    </Box>
  );
};
