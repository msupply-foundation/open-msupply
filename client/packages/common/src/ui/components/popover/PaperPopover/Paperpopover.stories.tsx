import React from 'react';
import { Story } from '@storybook/react';
import { PaperPopover } from './PaperPopover';
import { PaperPopoverSection } from '../../../components/popover';
import { Box } from '@mui/system';
import { Typography } from '@mui/material';

export default {
  title: 'Popover/PaperPopover',
  component: PaperPopover,
};

const Example: Story = () => {
  return (
    <>
      <PaperPopover
        Content={
          <PaperPopoverSection labelKey="app.admin">
            Some content here!
          </PaperPopoverSection>
        }
      >
        <Box
          width={300}
          height={300}
          bgcolor="aqua"
          justifyContent="center"
          alignItems="center"
        >
          <Typography>Hover me!</Typography>
        </Box>
      </PaperPopover>
    </>
  );
};

export const Primary = Example.bind({});
