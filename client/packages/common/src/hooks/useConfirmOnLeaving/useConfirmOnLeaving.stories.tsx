import React from 'react';
import { Grid } from '@mui/material';
import { StoryFn } from '@storybook/react';
import { useConfirmOnLeaving } from './useConfirmOnLeaving';
import { ToggleButton } from '@common/components';

export default {
  title: 'Hooks/useConfirmOnLeaving',
  component: useConfirmOnLeaving,
};

const Template: StoryFn = () => {
  const { isDirty, setIsDirty } = useConfirmOnLeaving('storybook');

  return (
    <Grid>
      <ToggleButton
        selected={isDirty}
        onClick={() => setIsDirty(!isDirty)}
        label="Prompt if leaving this page"
        value="dirty"
      />
    </Grid>
  );
};

export const Primary = Template.bind({});
