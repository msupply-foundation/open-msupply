import React from 'react';
import { Box, FormControlLabel, Switch } from '@mui/material';
import { StoryFn, Meta } from '@storybook/react';
import { LoadingButton } from './LoadingButton';
import { ArrowRightIcon, SvgIconProps } from '@common/icons';

const Template: StoryFn<React.FC<SvgIconProps>> = args => {
  const [isLoading, setIsLoading] = React.useState(false);
  return (
    <Box>
      <Box>
        <LoadingButton
          isLoading={isLoading}
          endIcon={<ArrowRightIcon {...args} />}
          onClick={() => setIsLoading(true)}
        >
          Submit
        </LoadingButton>
      </Box>
      <Box>
        <FormControlLabel
          control={
            <Switch
              checked={isLoading}
              onChange={() => setIsLoading(!isLoading)}
            />
          }
          label="loading?"
        />
      </Box>
    </Box>
  );
};

export const Primary = Template.bind({});
export const Secondary = Template.bind({});

export default {
  title: 'Buttons/LoadingButton',
  component: LoadingButton,
} as Meta<typeof LoadingButton>;

Secondary.args = { color: 'secondary' } as SvgIconProps;
