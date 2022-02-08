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
  const iconStyles = { color: 'gray.main', height: '16px', width: '16px' };
  const textStyles = {
    color: 'gray.main',
    fontSize: '12px',
    marginInlineStart: '8px',
  };

  return (
    <Box gap={2} display="flex" flex={1} alignItems="center">
      {store.code && (
        <PaddedCell>
          <HomeIcon sx={iconStyles} />
          <Typography sx={textStyles}>{store.code}</Typography>
        </PaddedCell>
      )}
      {user.name && (
        <PaddedCell>
          <UserIcon sx={iconStyles} />
          <Typography sx={textStyles}>{user.name}</Typography>
        </PaddedCell>
      )}
    </Box>
  );
};
