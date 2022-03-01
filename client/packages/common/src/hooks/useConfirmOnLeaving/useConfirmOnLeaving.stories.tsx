import React, { useState } from 'react';
import { Grid } from '@mui/material';
import { Story } from '@storybook/react';
import { useConfirmOnLeaving } from './useConfirmOnLeaving';
import { ToggleButton } from '@common/components';

export default {
  title: 'Hooks/useConfirmOnLeaving',
  component: useConfirmOnLeaving,
};

const Template: Story = () => {
  const [isUnsaved, setIsUnsaved] = useState(false);
  useConfirmOnLeaving(isUnsaved);

  return (
    <Grid>
      <ToggleButton
        selected={isUnsaved}
        onClick={() => setIsUnsaved(!isUnsaved)}
        label="Prompt if leaving this page"
        value="dirty"
      />
    </Grid>
  );
};

export const Primary = Template.bind({});
