import React from 'react';
import { Story } from '@storybook/react';
import { StoryProvider } from '../../utils';
import { useRowRenderCount } from './useRowRenderCount';
import { useTheme } from '@common/styles';
import { Box } from '@mui/system';
import { Typography } from '@mui/material';

export default {
  title: 'Hooks/useRowRenderCount',
};

const Example = () => {
  const rowsToRender = useRowRenderCount();
  const theme = useTheme();

  const { mixins } = theme;
  const { table } = mixins;

  return (
    <Box>
      <Box bgcolor={theme.palette.gray.dark} height={table.headerRow.height}>
        <Typography variant="h5">
          Adjust your browser window or viewport height to change the number of
          rows rendered
        </Typography>
      </Box>

      {Array.from({ length: rowsToRender }).map((_, i) => {
        const isEven = i % 2 === 0;
        const bg = isEven
          ? theme.palette.primary.main
          : theme.palette.secondary.main;
        return (
          <Box key={i} bgcolor={bg} height={table.dataRow.height}>
            Row #{i}
          </Box>
        );
      })}

      <Box
        bgcolor={theme.palette.gray.dark}
        height={table.paginationRow.height}
      >
        <Typography variant="h4">Footer / Pagination</Typography>
      </Box>
    </Box>
  );
};

const Template: Story = () => {
  return (
    <StoryProvider>
      <Example />
    </StoryProvider>
  );
};

export const Primary = Template.bind({});
