import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Box, styled, Toolbar } from '@mui/material';

import { DetailFormSkeleton } from './DetailFormSkeleton';
import {
  AppBarButtons,
  AppBarContent,
  AppFooter,
} from '../../components/portals';
import { useAppBarRect } from '@common/hooks';

export default {
  title: 'Skeleton/DetailFormSkeleton',
  component: DetailFormSkeleton,
} as ComponentMeta<typeof DetailFormSkeleton>;

const StyledContainer = styled(Box)(({ theme }) => ({
  marginRight: 0,
  minHeight: 90,
  paddingLeft: 16,
  paddingRight: 16,

  ...theme.mixins.header,
}));

const Template: ComponentStory<typeof DetailFormSkeleton> = () => {
  const { ref } = useAppBarRect();
  return (
    <Box display="flex" flexDirection="column">
      <Box flex={1} display="flex" flexDirection="column" overflow="hidden">
        <StyledContainer
          ref={ref}
          sx={{ boxShadow: theme => theme.shadows[2] }}
        >
          <Toolbar disableGutters>
            <AppBarButtons />
          </Toolbar>
          <AppBarContent />
        </StyledContainer>
        <Box display="flex" flex={1} overflow="auto">
          <DetailFormSkeleton />
        </Box>
      </Box>
      <AppFooter />
    </Box>
  );
};
export const Primary = Template.bind({});
