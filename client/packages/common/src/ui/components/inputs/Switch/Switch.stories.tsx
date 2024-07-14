import React from 'react';
import { StoryFn, Meta } from '@storybook/react';

import { Switch } from './Switch';
import { Box } from '@mui/material';

export default {
  title: 'Inputs/Switch',
  component: Switch,
} as Meta<typeof Switch>;

const Template: StoryFn<typeof Switch> = args => {
  const [checked, setChecked] = React.useState(false);
  return (
    <Box>
      <Switch
        label="default color"
        onChange={() => setChecked(!checked)}
        checked={checked}
        {...args}
      />
      <Switch
        label="color set to gray"
        onChange={() => setChecked(!checked)}
        checked={checked}
        {...args}
        color="gray"
      />
      <Switch
        label="color set to secondary"
        onChange={() => setChecked(!checked)}
        checked={checked}
        color="secondary"
        {...args}
      />
      <Switch
        label="disabled (off)"
        onChange={() => {}}
        checked={false}
        disabled
        {...args}
      />
      <Switch
        label="disabled (on)"
        onChange={() => {}}
        checked={true}
        disabled
        {...args}
      />
      <div style={{ marginTop: 50, fontStyle: 'italic' }}>
        Current state is {checked ? 'on' : 'off'}
      </div>
    </Box>
  );
};

export const Medium = Template.bind({});
export const Small = Template.bind({});
export const Bottom = Template.bind({});
export const End = Template.bind({});
export const Top = Template.bind({});

Medium.args = { size: 'medium' };
Small.args = { size: 'small' };
Bottom.args = { labelPlacement: 'bottom' };
End.args = { labelPlacement: 'end' };
Top.args = { labelPlacement: 'top' };
