import React, { useState } from 'react';
import { Grid } from '@mui/material';
import { Story } from '@storybook/react';
import { NavigationPrompt } from './NavigationPrompt';
import { ToggleButton } from '../../buttons';

export default {
  title: 'Navigation/NavigationPrompt',
  component: NavigationPrompt,
};

const Template: Story = () => {
  const [isUnsaved, setIsUnsaved] = useState(false);

  return (
    <Grid>
      <ToggleButton
        selected={isUnsaved}
        onClick={() => setIsUnsaved(!isUnsaved)}
        label="Prompt if leaving this page"
        value="dirty"
      />
      <NavigationPrompt isUnsaved={isUnsaved} />
    </Grid>
  );
};

export const Primary = Template.bind({});
