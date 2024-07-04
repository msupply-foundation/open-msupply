import React from 'react';
import { StoryFn } from '@storybook/react';
import { PaperClickPopover } from './PaperClickPopover';
import { PaperPopoverSection, usePopover } from '@common/components';
import { Box, Typography } from '@mui/material';

export default {
  title: 'Popover/PaperClickPopover',
  component: PaperClickPopover,
};

const Example: StoryFn = () => {
  const { show, hide, Popover } = usePopover();
  return (
    <>
      <PaperClickPopover
        show={show}
        hide={hide}
        Popover={Popover}
        Content={
          <PaperPopoverSection label="Heading">
            Some content here!
            <button
              onClick={() => {
                console.info('bye');
                hide();
              }}
            >
              Click me
            </button>
          </PaperPopoverSection>
        }
      >
        <Box>
          <Typography>Click me!</Typography>
        </Box>
      </PaperClickPopover>
    </>
  );
};

export const Primary = Example.bind({});
