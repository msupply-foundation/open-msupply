import React from 'react';
import { StoryFn } from '@storybook/react';
import { PaperHoverPopover } from './PaperHoverPopover';
import { PaperPopoverSection } from '@common/components';
import { Box, Typography } from '@mui/material';
import { useTranslation } from '@common/intl';

export default {
  title: 'Popover/PaperHoverPopover',
  component: PaperHoverPopover,
};

const Example: StoryFn = () => {
  const t = useTranslation('app');

  return (
    <>
      <PaperHoverPopover
        Content={
          <PaperPopoverSection label={t('admin')}>
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
      </PaperHoverPopover>
    </>
  );
};

export const Primary = Example.bind({});
