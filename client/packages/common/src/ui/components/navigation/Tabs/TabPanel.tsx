import { Box, BoxProps } from '@material-ui/system';
import React, { FC } from 'react';

type TabPanelProps = {
  currentTab: number;
  tab: number;
} & BoxProps;

export const TabPanel: FC<TabPanelProps> = ({
  children,
  tab,
  currentTab,
  ...boxProps
}) => {
  return (
    <>
      {currentTab === tab && (
        <Box role="tabpanel" {...boxProps}>
          {children}
        </Box>
      )}
    </>
  );
};
