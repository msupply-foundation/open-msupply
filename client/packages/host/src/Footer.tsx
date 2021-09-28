import React from 'react';
import {
  Box,
  Home,
  styled,
  Typography,
  User,
} from '@openmsupply-client/common';

export const Footer: React.FC = () => {
  const PaddedCell = styled(Box)({ display: 'flex', padding: '0 8px' });
  const iconStyles = { color: 'midGrey', height: '16px', width: '16px' };
  const textStyles = {
    color: 'midGrey',
    fontSize: '12px',
    padding: '0 0 0 8px',
  };
  // 25?
  return (
    <Box
      sx={{
        backgroundColor: 'background.toolbar',
        height: '32px',
        paddingLeft: '10px',
      }}
      display="flex"
      alignItems="center"
    >
      <PaddedCell>
        <Home sx={iconStyles} />
        <Typography sx={textStyles}>
          Central Pharmaceutical Warehouse
        </Typography>
      </PaddedCell>
      <PaddedCell>
        <User sx={iconStyles} />
        <Typography sx={textStyles}>Admin</Typography>
      </PaddedCell>
    </Box>
  );
};
