import React from 'react';
import { Story } from '@storybook/react';
import { TestingProvider } from '../..';
import { useRowRenderCount } from './useRowRenderCount';
import { useTheme } from '../../styles';
import { Box } from '@material-ui/system';
import { Typography } from '@material-ui/core';

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
      <Box bgcolor={theme.palette.darkGrey} height={table.headerRow.height}>
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

      <Box bgcolor={theme.palette.darkGrey} height={table.paginationRow.height}>
        <Typography variant="h4">Footer / Pagination</Typography>
      </Box>
    </Box>
  );
};

const Template: Story = () => {
  return (
    <TestingProvider>
      <Example />
    </TestingProvider>
  );
};

export const Primary = Template.bind({});
